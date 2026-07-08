import AIService from '../apps/backend/src/services/ai/AIService'
import type { PrismaClient } from '@lawdesk/database'

const testMatter = 'test-matter-0001'

// Minimal mock prisma that returns empty arrays for queries used by AIContextBuilder
const mockPrisma: Partial<Record<string, any>> = {
    matter: { findUnique: async ({ where }: any) => ({ matter_id: where.matter_id, title: 'Test Matter' }) },
    material: { findMany: async () => [{ title: 'Contract', description: 'Signed contract', content: '...' }] },
    evidence: { findMany: async () => [{ title: 'Invoice', description: 'Payment record', evidence_type: 'document' }] },
    fact: { findMany: async () => [{ title: 'Payment made', description: 'Client paid vendor' }] },
    issue: { findMany: async () => [{ title: 'Breach of contract', description: 'Alleged breach' }] },
    law: { findMany: async () => [{ title: 'Contract Law', citation: 'Art. 1' }] },
    argument: { findMany: async () => [{ title: 'Argument A', description: 'Reasoning', conclusion: 'We should win' }] },
    document: { findMany: async () => [{ title: 'Pleading', document_type: 'complaint', content: '...', status: 'draft' }] },
}

async function run() {
    const service = new AIService(mockPrisma as unknown as PrismaClient)

    // wrap adapter.generate to capture request/response
    const adapter = service.adapter
    const original = adapter.generate.bind(adapter)
    let lastRequest: any = null
    let lastResponse: any = null

    adapter.generate = async (req: any) => {
        lastRequest = req
        try {
            const r = await original(req)
            lastResponse = r
            return r
        } catch (e: any) {
            lastResponse = { error: String(e) }
            throw e
        }
    }

    try {
        const resp = await service.analyzeEvidence(testMatter)
        console.log('\n=== Provider Check Result ===')
        console.log('adapter:', service.adapter?.constructor?.name)
        console.log('provider (response):', lastResponse?.provider ?? 'unknown')
        console.log('model (response):', lastResponse?.model ?? lastResponse?.response?.model ?? 'unknown')
        console.log('\n--- request ---')
        console.log(JSON.stringify(lastRequest, null, 2))
        console.log('\n--- response ---')
        console.log(JSON.stringify(lastResponse, null, 2))
        console.log('\n--- analyzeEvidence returned ---')
        console.log(JSON.stringify(resp, null, 2))
    } catch (e: any) {
        console.error('analyzeEvidence failed:', e)
    }
}

run().catch((e) => { console.error(e); process.exit(1) })
