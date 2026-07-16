import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import fetch from 'node-fetch'

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

let app: any
let BASE = ''
let prisma: any

function requireRcTestDatabase() {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) throw new Error('DATABASE_URL_required_for_rc_tests')
    const databaseName = new URL(databaseUrl).pathname.replace(/^\//, '')
    if (databaseName !== 'lawdesk_rc_test') throw new Error(`unsafe_test_database:${databaseName}`)
}

beforeAll(async () => {
    requireRcTestDatabase()
    const { createPrismaClient } = await import('@lawdesk/database')
    const { default: buildApp } = await import('../src/server')
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
    it('ignores legacy document pipeline failure path because matter creation no longer runs it', async () => {
        const res = await fetch(`${BASE}/intake/ai-create-matter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Failing Pipeline Matter', client_name: 'A', opponent_name: 'B' }),
        })

        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body.matter_id).toBeDefined()
        expect(body.document_pipeline.skipped).toBe(true)

        // confirm no documents were created for this matter
        const docsRes = await fetch(`${BASE}/matters/${encodeURIComponent(body.matter_id)}/documents`)
        expect(docsRes.status).toBe(200)
        const docs = await docsRes.json()
        expect(Array.isArray(docs)).toBe(true)
        expect(docs.length).toBe(0)
    })
})
