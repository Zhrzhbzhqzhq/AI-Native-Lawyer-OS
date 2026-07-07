import fs from 'fs'
import path from 'path'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const entries = Array.from(formData.entries())

        const saved: Array<{ name: string; url: string; size: number; type?: string }> = []

        const uploadDir = path.join(process.cwd(), 'apps', 'frontend', 'public', 'uploads')
        await fs.promises.mkdir(uploadDir, { recursive: true })

        for (const [key, value] of entries) {
            if (value instanceof File) {
                const arrayBuffer = await value.arrayBuffer()
                const buffer = Buffer.from(arrayBuffer)
                const safeName = `${Date.now()}-${value.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`
                const dest = path.join(uploadDir, safeName)
                await fs.promises.writeFile(dest, buffer)
                saved.push({ name: value.name, url: `/uploads/${safeName}`, size: buffer.length, type: value.type })
            }
        }

        return new Response(JSON.stringify({ ok: true, files: saved }), { status: 200, headers: { 'content-type': 'application/json' } })
    } catch (e) {
        console.error('upload error', e)
        return new Response(JSON.stringify({ ok: false, error: 'upload failed' }), { status: 500, headers: { 'content-type': 'application/json' } })
    }
}
