import type { PrismaClient } from '@lawdesk/database'
import FactService from './factService'
import type { AIAudit } from './ai/aiAudit'
import { findFactLegalConclusion } from './ai/AIOutputValidator'
import FactUnderstandingService from './context_engine/fact_understanding_service'

type FactDraftInput = {
  title: string
  description?: string
  confidence?: number | null
  ai_reasoning?: string
  source_evidence_ids: string[]
}

export type FactDraftRow = {
  id: string
  draft_id: string
  matter_id: string
  title: string
  description: string | null
  confidence: number | null
  ai_reasoning: string | null
  source_evidence_ids: unknown
  review_status: string
  lawyer_note: string | null
  published_fact_id: string | null
  published_at: Date | null
  created_at: Date
  updated_at: Date
}

type FactDraftGenerateResult = {
  status: 'fact_draft_ready'
  idempotent: boolean
  fact_drafts: FactDraftRow[]
  ai_audit: AIAudit | null
}

type FactDraftPublishResult = {
  status: 'facts_published'
  matter_id: string
  created_facts: any[]
  links_count: number
  ignored_count: number
}

const REVIEW_STATUSES = ['pending', 'accepted', 'edited', 'ignored'] as const

function uniqueStrings(values: unknown[]) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
}

function clampConfidence(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return null
  return Math.max(0, Math.min(1, number))
}

const FORMAL_FACT_FORBIDDEN_PATTERNS = [
  /来源材料ID/i,
  /来源材料[:：]/i,
  /证明目标[:：]/i,
  /AI判断/i,
  /AI判断理由/i,
  /可信度/i,
  /\bmat-[a-z0-9-]+\b/i,
  /source_evidence_ids/i,
  /confidence/i,
  /ai_reasoning/i,
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  /\.(md|txt|json|pdf|docx?)(?:\s|$|，|。|；|、)/i,
]

function normalizeWhitespace(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

export function assertFormalFactClean(title: string, description: string) {
  const combined = `${title}\n${description}`
  if (FORMAL_FACT_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(combined)) || findFactLegalConclusion(title, description)) {
    const error = new Error('unsafe_formal_fact_content')
    ;(error as any).code = 'unsafe_formal_fact_content'
    throw error
  }
}

function cleanFormalFactText(value: unknown) {
  const raw = String(value || '')
  const summary = raw.match(/摘要[:：]\s*([\s\S]*?)(?:来源材料[:：]|证明目标[:：]|AI判断|可信度[:：]|来源材料ID[:：]|$)/i)?.[1]
  return normalizeWhitespace(summary || raw)
    .replace(/^关于[:：]\s*/, '')
    .replace(/^(事实|事实陈述|摘要|AI判断|AI判断理由|证明目标)[:：]\s*/i, '')
    .replace(/证据$/, '')
    .trim()
}

export function buildFormalFactContent(draft: { title?: string | null; description?: string | null }, _matter?: { title?: string | null }) {
  const rawTitle = normalizeWhitespace(draft.title)
  const rawDescription = normalizeWhitespace(draft.description)
  const title = cleanFormalFactText(rawTitle)
  const description = cleanFormalFactText(rawDescription) || title
  if (!title || !description) {
    const error = new Error('formal_fact_content_required')
    ;(error as any).code = 'formal_fact_content_required'
    throw error
  }
  assertFormalFactClean(title, description)
  return { title, description }
}

function getSourceEvidenceIds(suggestion: any, evidences: any[]) {
  const validEvidenceIds = new Set(evidences.map((evidence) => String(evidence.evidence_id)))
  const explicit = [
    ...(Array.isArray(suggestion?.source_evidence_ids) ? suggestion.source_evidence_ids : []),
    ...(Array.isArray(suggestion?.evidence_ids) ? suggestion.evidence_ids : []),
  ]
  if (explicit.length > 0) {
    const ids = uniqueStrings(explicit)
    return ids.every((id) => validEvidenceIds.has(id)) ? ids : []
  }

  const titles = Array.isArray(suggestion?.evidence_titles) ? suggestion.evidence_titles.map((title: unknown) => String(title || '').trim()).filter(Boolean) : []
  if (titles.length > 0) {
    const evidenceIdByTitle = new Map(evidences.map((evidence) => [String(evidence.title || '').trim(), String(evidence.evidence_id || '')]))
    const matched = titles.map((title: string) => evidenceIdByTitle.get(title)).filter(Boolean) as string[]
    return matched.length === titles.length ? uniqueStrings(matched) : []
  }
  return []
}

export class FactDraftService {
  constructor(
    private prisma: PrismaClient,
    private readonly factUnderstandingFactory: (prisma: PrismaClient) => Pick<FactUnderstandingService, 'generate'> = (client) => new FactUnderstandingService(client),
  ) {}

  async listDrafts(matter_id: string): Promise<FactDraftRow[]> {
    return this.prisma.factDraft.findMany({
      where: { matter_id },
      orderBy: { created_at: 'asc' },
    })
  }

  async generateDrafts(matter_id: string): Promise<FactDraftGenerateResult> {
    const existing = await this.prisma.factDraft.findMany({
      where: { matter_id, published_at: null },
      orderBy: { created_at: 'asc' },
    })
    if (existing.length > 0) {
      return { status: 'fact_draft_ready', idempotent: true, fact_drafts: existing, ai_audit: null }
    }

    const evidences = await this.prisma.evidence.findMany({
      where: { matter_id, status: { not: 'rejected' } },
      orderBy: { created_at: 'asc' },
    })
    if (evidences.length === 0) {
      const error = new Error('formal_evidence_required')
      ;(error as any).code = 'formal_evidence_required'
      throw error
    }

    const generation = await this.factUnderstandingFactory(this.prisma).generate(matter_id)
    const suggestions = generation.suggestions
    const drafts = this.normalizeSuggestions(suggestions, evidences)
    if (drafts.length === 0) {
      const error = new Error('fact_draft_empty')
      ;(error as any).code = 'fact_draft_empty'
      throw error
    }

    const created = await this.prisma.$transaction(async (tx: any) => {
      const rows = []
      for (const draft of drafts) {
        rows.push(await tx.factDraft.create({
          data: {
            draft_id: `fd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            matter_id,
            title: draft.title,
            description: draft.description || '',
            confidence: draft.confidence,
            ai_reasoning: draft.ai_reasoning || '',
            source_evidence_ids: JSON.stringify(draft.source_evidence_ids),
            review_status: 'pending',
          },
        }))
      }
      return rows
    })

    return { status: 'fact_draft_ready', idempotent: false, fact_drafts: created, ai_audit: generation.aiAudit }
  }

  async updateDraft(matter_id: string, draft_id: string, payload: { title?: string; description?: string; review_status?: string; lawyer_note?: string }): Promise<FactDraftRow> {
    const draft = await this.prisma.factDraft.findUnique({ where: { draft_id } })
    if (!draft) {
      const error = new Error('draft_not_found')
      ;(error as any).code = 'draft_not_found'
      throw error
    }
    if (String(draft.matter_id) !== String(matter_id)) {
      const error = new Error('draft_matter_mismatch')
      ;(error as any).code = 'draft_matter_mismatch'
      throw error
    }
    if (draft.published_at || draft.published_fact_id) {
      const error = new Error('draft_already_published')
      ;(error as any).code = 'draft_already_published'
      throw error
    }

    const patch: any = {}
    const changesContent = typeof payload.title === 'string' || typeof payload.description === 'string'
    if (typeof payload.title === 'string') {
      const title = payload.title.trim()
      if (!title) {
        const error = new Error('title_required')
        ;(error as any).code = 'title_required'
        throw error
      }
      patch.title = title
    }
    if (typeof payload.description === 'string') patch.description = payload.description
    if (typeof payload.lawyer_note === 'string') patch.lawyer_note = payload.lawyer_note

    if (changesContent) {
      patch.review_status = 'edited'
    } else if (typeof payload.review_status === 'string') {
      if (!REVIEW_STATUSES.includes(payload.review_status as any)) {
        const error = new Error('invalid_review_status')
        ;(error as any).code = 'invalid_review_status'
        throw error
      }
      patch.review_status = payload.review_status
    }

    if (Object.keys(patch).length === 0) {
      const error = new Error('nothing_to_update')
      ;(error as any).code = 'nothing_to_update'
      throw error
    }

    return this.prisma.factDraft.update({ where: { draft_id }, data: patch })
  }

  async publishDrafts(matter_id: string): Promise<FactDraftPublishResult> {
    return this.prisma.$transaction(async (tx: any) => {
      const drafts = await tx.factDraft.findMany({
        where: { matter_id },
        orderBy: { created_at: 'asc' },
      })
      if (drafts.length === 0) {
        const error = new Error('fact_drafts_required')
        ;(error as any).code = 'fact_drafts_required'
        throw error
      }

      const unconfirmed = drafts.filter((draft: any) => (
        !draft.published_fact_id
        && String(draft.review_status || '') !== 'ignored'
        && String(draft.review_status || '') !== 'accepted'
      ))
      if (unconfirmed.length > 0) {
        const error = new Error('pending_fact_drafts')
        ;(error as any).code = 'pending_fact_drafts'
        throw error
      }

      const factService = new FactService(tx)
      const matter = await tx.matter.findUnique({ where: { matter_id } })
      const validEvidences = await tx.evidence.findMany({ where: { matter_id }, select: { evidence_id: true } })
      const validEvidenceIds = new Set(validEvidences.map((evidence: any) => String(evidence.evidence_id)))
      const created_facts: any[] = []
      let links_count = 0
      let ignored_count = 0

      for (const draft of drafts) {
        if (String(draft.review_status) === 'ignored') {
          ignored_count += 1
          continue
        }

        if (draft.published_fact_id) {
          const existing = await tx.fact.findUnique({ where: { fact_id: draft.published_fact_id } })
          if (!existing) {
            const error = new Error('published_fact_not_found')
            ;(error as any).code = 'published_fact_not_found'
            throw error
          }
          created_facts.push(existing)
          continue
        }

        const sourceIds = uniqueStrings(
          Array.isArray(draft.source_evidence_ids)
            ? draft.source_evidence_ids
            : (() => {
                try {
                  return JSON.parse(String(draft.source_evidence_ids || '[]'))
                } catch {
                  return []
                }
              })()
        )
        if (sourceIds.length === 0 || sourceIds.some((id) => !validEvidenceIds.has(id))) {
          const error = new Error('invalid_source_evidence_ids')
          ;(error as any).code = 'invalid_source_evidence_ids'
          throw error
        }

        const formalFact = buildFormalFactContent(draft, matter || undefined)
        const fact = await factService.createFact(matter_id, {
          title: formalFact.title,
          description: formalFact.description,
          status: 'active',
        })
        for (const evidenceId of sourceIds) {
          await factService.attachEvidenceToFact(matter_id, fact.fact_id, evidenceId, 'from_fact_draft')
          links_count += 1
        }
        await tx.factDraft.update({
          where: { draft_id: draft.draft_id },
          data: {
            published_fact_id: fact.fact_id,
            published_at: new Date(),
          },
        })
        created_facts.push(fact)
      }

      return {
        status: 'facts_published' as const,
        matter_id,
        created_facts,
        links_count,
        ignored_count,
      }
    })
  }

  private normalizeSuggestions(suggestions: any[], evidences: any[]): FactDraftInput[] {
    if (!Array.isArray(suggestions)) return []
    return suggestions
      .map((suggestion) => {
        const title = String(suggestion?.title || suggestion?.name || '').trim()
        if (!title) return null
        const description = String(suggestion?.description || suggestion?.reason || '')
        if (findFactLegalConclusion(title, description)) return null
        const source_evidence_ids = getSourceEvidenceIds(suggestion, evidences)
        if (source_evidence_ids.length === 0) return null
        return {
          title,
          description,
          confidence: clampConfidence(suggestion?.confidence),
          ai_reasoning: String(suggestion?.ai_reasoning || suggestion?.reasoning || suggestion?.reason || ''),
          source_evidence_ids,
        }
      })
      .filter(Boolean) as FactDraftInput[]
  }
}

export default FactDraftService
