import type { PrismaClient } from '@lawdesk/database'
import type { MatterContext } from './types'

export class MatterContextBuilder {
    prisma: PrismaClient

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
    }

    // build: aggregate matter-related resources into a single context object
    // NOTE: intentionally does not call any AI provider, does not build prompts,
    // and does not modify any data. It performs safe, read-only queries and
    // returns a well-defined shape where collections may be empty arrays.
    async build(matterId: string): Promise<MatterContext> {
        const p = this.prisma as any

        // fetch matter (may be null)
        let matter = null
        try { matter = await p.matter.findUnique({ where: { matter_id: matterId } }) } catch (_e) { matter = null }

        // attempt to load client if matter references one
        let client = null
        try {
            const clientId = matter && (matter.client_id || matter.clientId)
            if (clientId) {
                client = await p.client.findUnique({ where: { client_id: clientId } })
            }
        } catch (_e) { client = null }

        // materials, evidence, research (knowledge), documents
        let materials: any[] = []
        let evidence: any[] = []
        let research: any[] = []
        let documents: any[] = []

        try { materials = await p.material.findMany({ where: { matter_id: matterId }, orderBy: { created_at: 'desc' } }) } catch (_e) { materials = [] }
        try { evidence = await p.evidence.findMany({ where: { matter_id: matterId }, orderBy: { created_at: 'desc' } }) } catch (_e) { evidence = [] }
        try { research = await p.knowledge.findMany({ where: { matter_id: matterId }, orderBy: { created_at: 'desc' } }) } catch (_e) { research = [] }
        try { documents = await p.document.findMany({ where: { matter_id: matterId }, orderBy: { created_at: 'desc' } }) } catch (_e) { documents = [] }

        return {
            matter,
            client,
            materials: Array.isArray(materials) ? materials : [],
            evidence: Array.isArray(evidence) ? evidence : [],
            research: Array.isArray(research) ? research : [],
            documents: Array.isArray(documents) ? documents : [],
        }
    }
}

export default MatterContextBuilder
