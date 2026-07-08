import type { PrismaClient } from '@lawdesk/database'
import FactService from '../factService'
import IssueService from '../issueService'
import LawService from '../lawService'

export class AIContextBuilder {
    prisma: PrismaClient

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
    }

    async buildMatterContext(matter_id: string) {
        const p = this.prisma

        const matter = await p.matter.findUnique({ where: { matter_id } }).catch(() => null)

        const materials = await p.material.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } }).catch(() => [])
        const evidence = await p.evidence.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } }).catch(() => [])

        // Prefer service layer to fetch facts/issues/laws so any business logic is respected
        const factService = new FactService(p)
        const issueService = new IssueService(p)
        const lawService = new LawService(p)

        const facts = await factService.listFacts(matter_id).catch(() => [])
        const issues = await issueService.listIssues(matter_id).catch(() => [])
        const laws = await lawService.listLaws(matter_id).catch(() => [])

        const ArgumentService = (await import('../argumentService')).default || (await import('../argumentService')).ArgumentService
        const argumentService = new ArgumentService(p)
        const argumentsList = await argumentService.listArguments(matter_id).catch(() => [])
        const documents = await p.document.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } }).catch(() => [])

        return {
            matter,
            materials,
            evidence,
            facts,
            issues,
            laws,
            arguments: argumentsList,
            documents,
        }
    }
}

export default AIContextBuilder
