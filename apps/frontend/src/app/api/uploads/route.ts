import { createHash } from 'node:crypto'
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MAX_FILES = 10
const MAX_FILE_SIZE = 25 * 1024 * 1024
const MAX_BATCH_SIZE = 100 * 1024 * 1024
const MAX_INLINE_TEXT_SIZE = 1024 * 1024

const FILE_TYPES: Record<string, { mime: string; accepted: string[]; text?: boolean }> = {
    txt: { mime: 'text/plain', accepted: ['text/plain'], text: true },
    md: { mime: 'text/markdown', accepted: ['text/markdown', 'text/plain'], text: true },
    pdf: { mime: 'application/pdf', accepted: ['application/pdf'] },
    doc: { mime: 'application/msword', accepted: ['application/msword'] },
    docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', accepted: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
    png: { mime: 'image/png', accepted: ['image/png'] },
    jpg: { mime: 'image/jpeg', accepted: ['image/jpeg'] },
    jpeg: { mime: 'image/jpeg', accepted: ['image/jpeg'] },
    m4a: { mime: 'audio/mp4', accepted: ['audio/mp4', 'audio/x-m4a'] },
    mp3: { mime: 'audio/mpeg', accepted: ['audio/mpeg', 'audio/mp3'] },
    wav: { mime: 'audio/wav', accepted: ['audio/wav', 'audio/x-wav'] },
}

type PreparedFile = {
    originalName: string
    extension: string
    mimeType: string
    buffer: Buffer
    checksum: string
    textContent?: string
}

function uploadRoot() {
    const cwd = process.cwd()
    const projectRoot = path.basename(cwd) === 'frontend' && path.basename(path.dirname(cwd)) === 'apps'
        ? path.resolve(cwd, '../..')
        : cwd
    return path.join(projectRoot, 'storage', 'intake-uploads')
}

function safeOriginalName(name: string) {
    return path.basename(String(name || '').replace(/\\/g, '/')).replace(/[\u0000-\u001f\u007f]/g, '').trim()
}

function uploadError(status: number, error: string, message: string) {
    return NextResponse.json({ ok: false, error, message }, { status })
}

export async function POST(request: Request) {
    const createdPaths: string[] = []
    try {
        const formData = await request.formData()
        const incoming = Array.from(formData.values()).filter((value): value is File => value instanceof File)
        if (incoming.length === 0) return uploadError(400, 'files_required', '请选择需要上传的文件')
        if (incoming.length > MAX_FILES) return uploadError(400, 'too_many_files', `单次最多上传 ${MAX_FILES} 个文件`)

        const prepared: PreparedFile[] = []
        let totalSize = 0
        for (const file of incoming) {
            const originalName = safeOriginalName(file.name)
            const extension = path.extname(originalName).slice(1).toLowerCase()
            const policy = FILE_TYPES[extension]
            if (!originalName || !policy) return uploadError(400, 'unsupported_file_type', `不支持的文件类型：${originalName || '未命名文件'}`)
            if (file.size <= 0) return uploadError(400, 'empty_file', `不能上传空文件：${originalName}`)
            if (file.size > MAX_FILE_SIZE) return uploadError(400, 'file_too_large', `文件超过 25 MB 限制：${originalName}`)
            totalSize += file.size
            if (totalSize > MAX_BATCH_SIZE) return uploadError(400, 'batch_too_large', '单次上传总大小不得超过 100 MB')

            const suppliedMime = String(file.type || '').toLowerCase()
            const genericMime = suppliedMime === '' || suppliedMime === 'application/octet-stream'
            if (!genericMime && !policy.accepted.includes(suppliedMime)) return uploadError(400, 'mime_extension_mismatch', `文件扩展名与 MIME 类型不匹配：${originalName}`)

            const buffer = Buffer.from(await file.arrayBuffer())
            if (buffer.length !== file.size || buffer.length === 0) return uploadError(400, 'invalid_file_content', `文件内容无效：${originalName}`)
            const checksum = createHash('sha256').update(buffer).digest('hex')
            prepared.push({
                originalName,
                extension,
                mimeType: genericMime ? policy.mime : suppliedMime,
                buffer,
                checksum,
                textContent: policy.text && buffer.length <= MAX_INLINE_TEXT_SIZE ? buffer.toString('utf8') : undefined,
            })
        }

        const root = uploadRoot()
        await mkdir(root, { recursive: true })
        const existingNames = await readdir(root)
        const storedByChecksum = new Map<string, string>()
        for (const name of existingNames) {
            const checksum = name.split('.')[0]
            if (/^[a-f0-9]{64}$/.test(checksum)) storedByChecksum.set(checksum, name)
        }

        const responseFiles = []
        for (const file of prepared) {
            let storedName = storedByChecksum.get(file.checksum)
            let duplicate = Boolean(storedName)
            if (!storedName) {
                storedName = `${file.checksum}.${file.extension}`
                const target = path.join(root, storedName)
                try {
                    await writeFile(target, file.buffer, { flag: 'wx' })
                    createdPaths.push(target)
                    storedByChecksum.set(file.checksum, storedName)
                } catch (error: any) {
                    if (error?.code !== 'EEXIST') throw error
                    duplicate = true
                }
            }

            const uploadedAt = new Date().toISOString()
            const storageUri = `storage/intake-uploads/${storedName}`
            responseFiles.push({
                original_name: file.originalName,
                stored_name: storedName,
                mime_type: file.mimeType,
                size: file.buffer.length,
                uploaded_at: uploadedAt,
                storage_uri: storageUri,
                checksum: file.checksum,
                duplicate,
                ...(file.textContent !== undefined ? { text_content: file.textContent } : {}),
                // Compatibility fields consumed by the current analyzing/report pages.
                name: file.originalName,
                type: file.mimeType,
                upload_time: uploadedAt,
                uploaded_path: storageUri,
                ...(file.textContent !== undefined ? { content: file.textContent } : {}),
            })
        }

        return NextResponse.json({ ok: true, files: responseFiles })
    } catch (error) {
        await Promise.all(createdPaths.map((target) => unlink(target).catch(() => undefined)))
        console.error('upload error', error)
        return uploadError(500, 'upload_failed', '文件上传失败，请稍后重试')
    }
}
