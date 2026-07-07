import fs from 'fs'
import path from 'path'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const entries = Array.from(formData.entries())
        const saved: Array<{ name: string; size: number; type?: string; upload_time: string; storage_uri?: string }> = []

        // Save uploads to a non-public storage directory
        const uploadDir = path.join(process.cwd(), 'storage', 'intake-uploads')
        await fs.promises.mkdir(uploadDir, { recursive: true })

        // optional matter_id in form to persist metadata to DB
        const matter_id = String(formData.get('matter_id') || '') || null

        for (const [key, value] of entries) {
            if (value instanceof File) {
                const arrayBuffer = await value.arrayBuffer()
                const buffer = Buffer.from(arrayBuffer)
                const safeName = `${Date.now()}-${value.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`
                const dest = path.join(uploadDir, safeName)
                await fs.promises.writeFile(dest, buffer)
                const storageUri = `storage/intake-uploads/${safeName}`
                // Do not expose storage paths publicly; return only metadata
                saved.push({ name: value.name, size: buffer.length, type: value.type, upload_time: new Date().toISOString(), storage_uri: storageUri })
            }
        }

        // If a matter_id is provided, create Material records via backend API
        const createdMaterials: any[] = []
        if (matter_id) {
            const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'
            for (const f of saved) {
                try {
                    const material_id = `mat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
                    const payload = {
                        material_id,
                        title: f.name,
                        material_type: 'uploaded',
                        source: 'upload',
                        storage_uri: f.storage_uri || '',
                        status: 'active',
                    }
                    const res = await fetch(`${API}/matters/${encodeURIComponent(matter_id)}/materials`, {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify(payload),
                    })
                    if (res.ok) {
                        const json = await res.json()
                        createdMaterials.push(json)
                    }
                } catch (e) {
                    // ignore per-file failures; continue
                    console.error('create material failed', e)
                }
            }
        }

        return new Response(JSON.stringify({ ok: true, files: saved, created_materials: createdMaterials }), { status: 200, headers: { 'content-type': 'application/json' } })
    } catch (e) {
        console.error('upload error', e)
        return new Response(JSON.stringify({ ok: false, error: 'upload failed' }), { status: 500, headers: { 'content-type': 'application/json' } })
    }
}
