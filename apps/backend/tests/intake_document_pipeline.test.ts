import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import fetch from 'node-fetch'
import { createPrismaClient } from '@lawdesk/database'

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

describe('Intake document pipeline integration', () => {
    it('runs document pipeline and returns draft id in response meta', async () => {
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
        // pipeline result surfaced under meta.document_pipeline
        expect(body.document_pipeline).toBeDefined()
        expect(body.document_pipeline.draftDocumentId).toBe('doc-mocked-1')
    })
})
