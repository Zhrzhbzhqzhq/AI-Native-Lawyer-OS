import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import fetch from 'node-fetch'
import { createPrismaClient } from '@lawdesk/database'

// Mock DocumentPipeline to simulate failure
vi.mock('../src/services/ai/DocumentPipeline', () => {
    return {
        default: class {
            prisma: any
            constructor(prisma: any) { this.prisma = prisma }
            async run(matterId: string) {
                throw new Error('document_generation_error')
            }
        }
    }
})

import buildApp from '../src/server'

let app: any
let BASE = ''
let prisma: any

beforeAll(async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://qingzhang@localhost:5432/lawdesk'
    prisma = createPrismaClient()

    app = await buildApp()
    await app.listen({ port: 0 })
    const addr: any = app.server.address()
    const port = addr && addr.port ? addr.port : 4000
    BASE = `http://127.0.0.1:${port}`
})

afterAll(async () => {
    try { await app.close() } catch (_) { }
    try { await prisma.$disconnect() } catch (_) { }
})

describe('Intake document pipeline failure integration', () => {
    it('returns 502 and does not create any documents when pipeline fails', async () => {
        const res = await fetch(`${BASE}/intake/ai-create-matter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Failing Pipeline Matter', client_name: 'A', opponent_name: 'B' }),
        })

        expect(res.status).toBe(502)
        const body = await res.json()
        expect(body.error).toBe('document_pipeline_failed')
        expect(body.matter_id).toBeDefined()

        // confirm no documents were created for this matter
        const docsRes = await fetch(`${BASE}/matters/${encodeURIComponent(body.matter_id)}/documents`)
        expect(docsRes.status).toBe(200)
        const docs = await docsRes.json()
        expect(Array.isArray(docs)).toBe(true)
        expect(docs.length).toBe(0)
    })
})
