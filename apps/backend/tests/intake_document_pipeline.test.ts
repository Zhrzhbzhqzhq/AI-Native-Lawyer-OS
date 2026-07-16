import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import fetch from 'node-fetch'

// Mock DocumentPipeline before building the app
vi.mock('../src/services/ai/DocumentPipeline', () => {
    return {
        default: class {
            prisma: any
            constructor(prisma: any) { this.prisma = prisma }
            async run(matterId: string) {
                return { success: true, draftDocumentId: 'doc-mocked-1', provider: 'mock', model: 'm1' }
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

describe('Intake document pipeline integration', () => {
    it('does not create documents during matter creation', async () => {
        const res = await fetch(`${BASE}/intake/ai-create-matter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Test Matter for Pipeline', client_name: 'A', opponent_name: 'B' }),
        })
        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body.matter_id).toBeDefined()
        expect(body.created).toBe(true)
        expect(body.ai).toBeDefined()
        expect(body.document_pipeline).toBeDefined()
        expect(body.document_pipeline.skipped).toBe(true)
        const docs = await prisma.document.count({ where: { matter_id: body.matter_id } })
        const drafts = await (prisma as any).documentDraft.count({ where: { matter_id: body.matter_id } })
        expect(docs).toBe(0)
        expect(drafts).toBe(0)
    })
})
