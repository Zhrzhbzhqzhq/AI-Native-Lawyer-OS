import { describe, it, expect } from 'vitest'
import MatterContextBuilder from '../MatterContextBuilder'

// Create a lightweight mocked Prisma client with the methods used by the builder
function makeMockPrisma(overrides: any = {}) {
    return {
        matter: { findUnique: async (args: any) => overrides.matter ?? null },
        client: { findUnique: async (args: any) => overrides.client ?? null },
        material: { findMany: async (args: any) => overrides.materials ?? [] },
        evidence: { findMany: async (args: any) => overrides.evidence ?? [] },
        knowledge: { findMany: async (args: any) => overrides.research ?? [] },
        document: { findMany: async (args: any) => overrides.documents ?? [] },
    }
}

describe('MatterContextBuilder', () => {
    it('returns empty arrays and nulls for unknown matter', async () => {
        const p = makeMockPrisma()
        const b = new MatterContextBuilder(p as any)
        const ctx = await b.build('m-unknown')
        expect(ctx.matter).toBeNull()
        expect(ctx.client).toBeNull()
        expect(Array.isArray(ctx.materials)).toBe(true)
        expect(Array.isArray(ctx.evidence)).toBe(true)
        expect(Array.isArray(ctx.research)).toBe(true)
        expect(Array.isArray(ctx.documents)).toBe(true)
    })

    it('returns populated fields when prisma returns data', async () => {
        const fakeMatter = { matter_id: 'm-1', title: 'T' }
        const fakeClient = { client_id: 'c-1', name: 'Alice' }
        const p = makeMockPrisma({ matter: fakeMatter, client: fakeClient, materials: [{ id: 1 }], evidence: [{ id: 2 }], research: [{ id: 3 }], documents: [{ id: 4 }] })
        const b = new MatterContextBuilder(p as any)
        const ctx = await b.build('m-1')
        expect(ctx.matter).toEqual(fakeMatter)
        // client may be null unless matter contains client_id; builder only queries if matter has client_id
        // so simulate matter with client_id in a second check
    })

    it('loads client when matter contains client_id', async () => {
        const fakeMatter = { matter_id: 'm-2', client_id: 'c-1' }
        const fakeClient = { client_id: 'c-1', name: 'Bob' }
        const p = makeMockPrisma({ matter: fakeMatter, client: fakeClient })
        const b = new MatterContextBuilder(p as any)
        const ctx = await b.build('m-2')
        expect(ctx.matter).toEqual(fakeMatter)
        expect(ctx.client).toEqual(fakeClient)
    })
})
