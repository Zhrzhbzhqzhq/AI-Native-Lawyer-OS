import { describe, it, expect } from 'vitest'
import MatterContextBuilder from '../src/services/ai/context/MatterContextBuilder'

function makePrismaStub(data: any) {
    return {
        matter: {
            findUnique: async ({ where }: any) => {
                if (where && where.matter_id === data.matter.matter_id) return data.matter
                return null
            }
        },
        client: { findUnique: async () => null },
        material: { findMany: async ({ where }: any) => data.materials || [] },
        evidence: { findMany: async ({ where }: any) => data.evidence || [] },
        knowledge: { findMany: async () => data.research || [] },
        document: { findMany: async () => data.documents || [] },
    }
}

describe('MatterContextBuilder caseFacts derivation', () => {
    it('extracts plaintiff/defendant/cause/amount/date/claims/evidence titles from description', async () => {
        const matter = {
            matter_id: 'm-test-1',
            title: '民事案件：原告 张三 VS 被告 李四',
            description: '案件名称：借款纠纷\n委托人：张三\n对方当事人：李四\n案由：民间借贷纠纷\n借款金额10000元\n发生时间：2024年1月1日\n诉讼请求：要求偿还本金10000元',
            matter_type: 'civil'
        }

        const materials = [{ material_id: 'mat-1', title: '借款合同-人民币10,000元', material_type: 'contract' }]
        const evidence = [
            { evidence_id: 'e-1', title: '借款合同扫描件', description: '证明借款事实' },
            { evidence_id: 'e-2', title: '{}', description: '{}' }
        ]

        const prisma = makePrismaStub({ matter, materials, evidence, research: [], documents: [] }) as any
        const b = new MatterContextBuilder(prisma)
        const ctx = await b.build(matter.matter_id)
        expect(ctx.caseFacts).toBeDefined()
        expect(ctx.caseFacts?.plaintiff).toBe('张三')
        expect(ctx.caseFacts?.defendant).toBe('李四')
        expect(ctx.caseFacts?.causeOfAction).toContain('民间借贷')
        expect(ctx.caseFacts?.amount).toBe('10000')
        expect(ctx.caseFacts?.keyDates && ctx.caseFacts.keyDates.length).toBeGreaterThan(0)
        expect(ctx.caseFacts?.claims && ctx.caseFacts.claims[0]).toContain('要求偿还本金')
        expect(ctx.caseFacts?.evidenceTitles).toContain('借款合同扫描件')
        expect(ctx.caseFacts?.evidenceTitles).not.toContain('{}')
    })

    it('returns null/empty when fields missing and preserves original context fields', async () => {
        const matter = { matter_id: 'm-test-2', title: 'Test Matter', description: '', matter_type: '' }
        const prisma = makePrismaStub({ matter, materials: [], evidence: [], research: [], documents: [] }) as any
        const b = new MatterContextBuilder(prisma)
        const ctx = await b.build(matter.matter_id)
        expect(ctx.caseFacts).toBeDefined()
        expect(ctx.caseFacts?.plaintiff).toBeNull()
        expect(ctx.caseFacts?.defendant).toBeNull()
        expect(ctx.caseFacts?.causeOfAction).toBeNull()
        expect(ctx.caseFacts?.amount).toBeNull()
        expect(Array.isArray(ctx.caseFacts?.keyDates)).toBe(true)
        // original fields remain
        expect(ctx.matter).toBeDefined()
        expect(Array.isArray(ctx.materials)).toBe(true)
    })
})
