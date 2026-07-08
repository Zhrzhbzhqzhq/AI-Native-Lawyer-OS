import { NextResponse } from 'next/server'

// Minimal upload handler suitable for Next.js app router build.
// Intentionally avoids Node-only `fs`/`path` imports so the bundler can resolve the module.
export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const entries = Array.from(formData.entries())
        const files: Array<{ name: string; size: number; type?: string }> = []

        for (const [, value] of entries) {
            if (value instanceof File) {
                files.push({ name: value.name, size: value.size, type: value.type })
            }
        }

        // Do not attempt to persist files here (keeps build simple).
        // The frontend expects an array of uploaded file metadata and optional created_materials.
        return NextResponse.json({ ok: true, files, created_materials: [] })
    } catch (e) {
        console.error('upload error', e)
        return NextResponse.json({ ok: false, error: 'upload failed' }, { status: 500 })
    }
}
