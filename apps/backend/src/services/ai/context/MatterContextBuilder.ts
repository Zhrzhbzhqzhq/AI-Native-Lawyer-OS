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

        // Derive minimal structured case facts from available free-text/context fields.
        const allTextSources: string[] = []
        if (matter && typeof matter.description === 'string') allTextSources.push(matter.description)
        if (matter && typeof matter.title === 'string') allTextSources.push(matter.title)
        materials.forEach((m: any) => { if (m && m.title) allTextSources.push(String(m.title)) })
        evidence.forEach((e: any) => { if (e && e.title) allTextSources.push(String(e.title)); if (e && e.description) allTextSources.push(String(e.description)) })

        const joined = allTextSources.join('\n')

        const extractFirst = (regex: RegExp) => {
            const m = joined.match(regex)
            return m && m[1] ? m[1].trim() : null
        }

        // plaintiff (原告 / 委托人)
        const plaintiff = extractFirst(/(?:原告|委托人)\s*[:：]?\s*([^,;\n\r]+)/i) || extractFirst(/([^\s\-–—]+)\s+VS\s+[^\s]+/i) || null
        // defendant (被告 / 对方当事人)
        const defendant = extractFirst(/(?:被告|对方当事人)\s*[:：]?\s*([^,;\n\r]+)/i) || extractFirst(/[^\s]+\s+VS\s+([^\s]+)/i) || null
        // cause of action (案由 / 案件类型)
        const causeOfAction = extractFirst(/案由\s*[:：]?\s*([^\n\r]+)/i) || extractFirst(/案件类型\s*[:：]?\s*([^\n\r]+)/i) || null
        // amount detection (simple numbers with optional RMB/元)
        const amountMatch = joined.match(/(?:人民币|RMB|￥)?\s*([0-9][0-9,]*)\s*(?:元)?/i)
        const amount = amountMatch && amountMatch[1] ? amountMatch[1].replace(/[\s,]/g, '') : null
        // dates
        const dateRegex = /(\d{4}年\d{1,2}月\d{1,2}日)|(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/g
        const keyDates: string[] = []
        let dm: RegExpExecArray | null
        while ((dm = dateRegex.exec(joined)) !== null) {
            if (dm[0]) keyDates.push(dm[0])
        }
        // claims (诉讼请求 / 请求)
        const claims: string[] = []
        const claimMatch = joined.match(/(?:诉讼请求|请求)\s*[:：]?\s*([^\n\r]+)/i)
        if (claimMatch && claimMatch[1]) claims.push(claimMatch[1].trim())

        // evidence titles - filter out placeholders like '{}' or empty or purely punctuation
        const evidenceTitles = (Array.isArray(evidence) ? evidence : []).map((e: any) => (e && e.title) ? String(e.title).trim() : '').filter((t: string) => {
            if (!t) return false
            if (/^\{+\s*\}+$/i.test(t)) return false
            // require at least one letter or number (Unicode aware) to consider valid
            if (!/[\p{L}\p{N}]/u.test(t)) return false
            return true
        })

        const caseFacts = {
            plaintiff: plaintiff || null,
            defendant: defendant || null,
            causeOfAction: causeOfAction || null,
            amount: amount || null,
            keyDates,
            claims,
            evidenceTitles,
        }

        return {
            matter,
            client,
            materials: Array.isArray(materials) ? materials : [],
            evidence: Array.isArray(evidence) ? evidence : [],
            research: Array.isArray(research) ? research : [],
            documents: Array.isArray(documents) ? documents : [],
            caseFacts,
        }
    }
}

export default MatterContextBuilder
