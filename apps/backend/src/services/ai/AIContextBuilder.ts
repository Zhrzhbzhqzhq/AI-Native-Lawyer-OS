import type { PrismaClient } from '@lawdesk/database'

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
        const facts = await p.fact.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } }).catch(() => [])
        const issues = await p.issue.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } }).catch(() => [])
        const laws = await p.law.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } }).catch(() => [])
        const argumentsList = await p.argument.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } }).catch(() => [])
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
