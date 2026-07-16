"use client"

import React, { useCallback, useState } from 'react'

export type UploadedFile = {
    original_name: string
    stored_name: string
    mime_type: string
    size: number
    uploaded_at: string
    storage_uri: string
    checksum: string
    duplicate: boolean
    text_content?: string
    name: string
    type: string
    upload_time: string
    uploaded_path: string
    content?: string
}

function isRelativeStorageUri(value: unknown): value is string {
    if (typeof value !== 'string' || !value.startsWith('storage/intake-uploads/')) return false
    if (value.startsWith('/') || value.includes('..') || value.includes('\\') || /^[a-z][a-z0-9+.-]*:/i.test(value)) return false
    return value.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..')
}

export function isUploadedFile(value: unknown): value is UploadedFile {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const file = value as Record<string, unknown>
    if (typeof file.original_name !== 'string' || !file.original_name.trim()) return false
    if (typeof file.stored_name !== 'string' || !/^[a-f0-9]{64}\.[a-z0-9]+$/.test(file.stored_name)) return false
    if (typeof file.mime_type !== 'string' || !file.mime_type.trim()) return false
    if (typeof file.size !== 'number' || !Number.isFinite(file.size) || file.size <= 0) return false
    if (typeof file.uploaded_at !== 'string' || !Number.isFinite(new Date(file.uploaded_at).getTime())) return false
    if (!isRelativeStorageUri(file.storage_uri) || !file.storage_uri.endsWith(`/${file.stored_name}`)) return false
    if (typeof file.checksum !== 'string' || !/^[a-f0-9]{64}$/.test(file.checksum) || !file.stored_name.startsWith(`${file.checksum}.`)) return false
    if (typeof file.duplicate !== 'boolean') return false
    if (file.text_content !== undefined && typeof file.text_content !== 'string') return false
    if (file.name !== file.original_name || file.type !== file.mime_type || file.upload_time !== file.uploaded_at || file.uploaded_path !== file.storage_uri) return false
    if (file.content !== undefined && typeof file.content !== 'string') return false
    return true
}

function isUploadResponse(value: unknown): value is { ok: true; files: UploadedFile[] } {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const response = value as Record<string, unknown>
    return response.ok === true && Array.isArray(response.files) && response.files.length > 0 && response.files.every(isUploadedFile)
}

export default function Uploader({ onUploaded, matterId }: { onUploaded?: (files: UploadedFile[]) => void; matterId?: string | null }) {
    const [files, setFiles] = useState<File[]>([])
    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState<UploadedFile[]>([])
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const accept = '.md,.txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.m4a,.mp3,.wav'

    const handleFiles = useCallback((incoming: FileList | null) => {
        if (!incoming) return
        setError(null)
        setSuccess(null)
        const arr = Array.from(incoming).filter(Boolean)
        setFiles((current) => current.concat(arr))
    }, [])

    const removeAt = (index: number) => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))

    async function upload() {
        if (files.length === 0 || uploading) return
        setUploading(true)
        setError(null)
        setSuccess(null)
        try {
            const formData = new FormData()
            files.forEach((file) => formData.append('files', file, file.name))
            if (matterId) formData.append('matter_id', String(matterId))

            const response = await fetch('/api/uploads', { method: 'POST', body: formData })
            if (!response.ok) {
                const errorPayload = await response.json().catch(() => null)
                const safeMessage = errorPayload && typeof errorPayload === 'object' && typeof errorPayload.message === 'string' && errorPayload.message.length <= 160
                    ? errorPayload.message
                    : `上传失败（HTTP ${response.status}）`
                throw new Error(`http:${safeMessage}`)
            }

            const payload = await response.json().catch(() => { throw new Error('invalid_json') })
            if (!isUploadResponse(payload)) throw new Error('invalid_response')

            setUploaded(payload.files)
            setFiles([])
            setSuccess(`已成功接收 ${payload.files.length} 个文件`)
            onUploaded?.(payload.files)
        } catch (uploadError: any) {
            const code = String(uploadError?.message || '')
            if (code === 'invalid_json' || code === 'invalid_response') setError('上传返回数据暂不可用')
            else if (code.startsWith('http:')) setError(code.slice(5))
            else setError('无法上传文件，请稍后重试')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div style={{ marginTop: 6 }}>
            <div style={{ border: '1px dashed #e6e7eb', borderRadius: 8, padding: 18, background: '#ffffff', color: '#111827' }}>
                <div style={{ fontWeight: 600 }}>点击选择需要上传的文件</div>
                <div style={{ marginTop: 6, color: '#6b7280' }}>支持 TXT、Markdown、PDF、Word、PNG/JPEG、M4A/MP3/WAV；单文件最大 25 MB，单次最多 10 个</div>
                <input type="file" multiple accept={accept} onChange={(event) => handleFiles(event.target.files)} style={{ marginTop: 8 }} />
            </div>

            {files.length > 0 ? (
                <div style={{ marginTop: 12, border: '1px solid #f1f5f9', borderRadius: 8, background: '#fafafa' }}>
                    <ul style={{ listStyle: 'none', padding: 12, margin: 0 }}>
                        {files.map((file, index) => (
                            <li key={`${file.name}-${file.size}-${index}`} style={{ padding: '8px 6px', borderBottom: index < files.length - 1 ? '1px solid #f1f5f9' : 'none', color: '#111827', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div><div style={{ fontSize: 14 }}>{file.name}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{(file.size / 1024).toFixed(1)} KB</div></div>
                                <button onClick={() => removeAt(index)} disabled={uploading} style={{ background: 'transparent', border: 'none', color: '#111827', cursor: 'pointer' }}>移除</button>
                            </li>
                        ))}
                    </ul>
                    <div style={{ padding: 12, borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
                        <button onClick={upload} disabled={uploading} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontWeight: 600 }}>{uploading ? '上传中…' : error ? '重试上传' : '上传'}</button>
                    </div>
                </div>
            ) : null}

            {error ? <div role="alert" style={{ marginTop: 10, color: '#b91c1c' }}>{error}</div> : null}
            {success ? <div style={{ marginTop: 10, color: '#047857' }}>{success}</div> : null}

            {uploaded.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>已上传文件</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {uploaded.map((file) => (
                            <li key={`${file.checksum}-${file.original_name}`} style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', color: '#111827', display: 'grid', gridTemplateColumns: '1fr 120px 110px 160px', gap: 8 }}>
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.original_name}{file.duplicate ? '（已存在）' : ''}</div>
                                <div style={{ color: '#6b7280' }}>{file.mime_type}</div>
                                <div style={{ color: '#6b7280' }}>{(file.size / 1024).toFixed(1)} KB</div>
                                <div style={{ color: '#6b7280' }}>{new Date(file.uploaded_at).toLocaleString()}</div>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    )
}
