import type { PrismaClient } from '@lawdesk/database'
import type { AIAudit } from './ai/aiAudit'
import { classifyFactConcept, inferIssueTypeFromFacts, ISSUE_CONCEPT_ORDER, type IssueConcept } from './ai/legalConceptClassifier'

type ArgumentDraftInput = {
  title: string
  position?: string
  reasoning?: string
  counter_argument?: string
  response?: string
  risk?: string
  conclusion?: string
  confidence?: number | null
  ai_reasoning?: string
  source_fact_ids: string[]
  source_issue_ids: string[]
  source_law_ids: string[]
  issue_type?: IssueConcept
}

export type ArgumentDraftRow = {
  id: string
  matter_id: string
  title: string
  position: string | null
  reasoning: string | null
  counter_argument: string | null
  response: string | null
  risk: string | null
  conclusion: string | null
  confidence: number | null
  ai_reasoning: string | null
  source_fact_ids: unknown
  source_issue_ids: unknown
  source_law_ids: unknown
  review_status: string
  lawyer_note: string | null
  published_argument_id: string | null
  published_at: Date | null
  created_at: Date
  updated_at: Date
}

type ArgumentDraftGenerateResult = {
  status: 'argument_draft_ready'
  idempotent: boolean
  argument_drafts: ArgumentDraftRow[]
  ai_audit: AIAudit | null
}

type ArgumentDraftPublishResult = {
  status: 'arguments_published'
  matter_id: string
  created_arguments: any[]
  argument_fact_links: number
  argument_issue_links: number
  argument_law_links: number
  ignored_count: number
}

const REVIEW_STATUSES = ['pending', 'accepted', 'edited', 'ignored'] as const

const FORMAL_ARGUMENT_FORBIDDEN_PATTERNS = [
  /第\s*[xyｘｙ]\s*条/i,
  /\bTODO\b/i,
  /\bplaceholder\b/i,
  /待补充/,
  /\bprompt\b/i,
  /ai_reasoning/i,
  /source_(?:fact|issue|law)_ids/i,
  /review_status/i,
  /published_argument_id/i,
  /\b(?:mat|fact|issue|law|arg)-[a-z0-9-]+\b/i,
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
]

function uniqueStrings(values: unknown[]) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
}

function clampConfidence(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return null
  return Math.max(0, Math.min(1, number))
}

export function assertFormalArgumentContent(draft: { title?: unknown; reasoning?: unknown; conclusion?: unknown; position?: unknown; counter_argument?: unknown; response?: unknown; risk?: unknown }) {
  const title = String(draft.title || '').trim()
  const reasoning = String(draft.reasoning || '').trim()
  const conclusion = String(draft.conclusion || '').trim()
  if (!title || !reasoning || !conclusion) {
    const error = new Error('formal_argument_content_required')
    ;(error as any).code = 'formal_argument_content_required'
    throw error
  }
  const formalContent = [title, reasoning, conclusion, draft.position, draft.counter_argument, draft.response, draft.risk]
    .map((value) => String(value || ''))
    .join('\n')
  if (FORMAL_ARGUMENT_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(formalContent))) {
    const error = new Error('unsafe_formal_argument_content')
    ;(error as any).code = 'unsafe_formal_argument_content'
    throw error
  }
}

function composeDescription(draft: any) {
  return [
    draft.position ? `核心观点：${draft.position}` : '',
    draft.reasoning ? `论证过程：${draft.reasoning}` : '',
    draft.counter_argument ? `可能抗辩：${draft.counter_argument}` : '',
    draft.response ? `抗辩回应：${draft.response}` : '',
    draft.risk ? `风险与薄弱点：${draft.risk}` : '',
  ].filter(Boolean).join('\n')
}

function explicitIds(suggestion: any, rows: any[], idField: string, explicitKeys: string[]) {
  const validIds = new Set(rows.map((row) => String(row[idField])))
  const explicit = explicitKeys.flatMap((key) => Array.isArray(suggestion?.[key]) ? suggestion[key] : [suggestion?.[key]])
  const ids = uniqueStrings(explicit).sort()
  if (ids.length === 0 || ids.some((id) => !validIds.has(id))) return []
  return ids
}

function issueSourceFacts(issue: any) {
  return Array.isArray(issue?.facts) ? issue.facts.map((link: any) => link?.fact).filter(Boolean) : []
}

function lawSourceIssueIds(law: any) {
  const linked = Array.isArray(law?.issues) ? law.issues.map((link: any) => link?.issue_id || link?.issue?.issue_id) : []
  if (linked.length > 0) return uniqueStrings(linked).sort()
  return law?.issue_id ? [String(law.issue_id)] : []
}

function validateArgumentSourceClosure(issueType: IssueConcept, factIds: string[], issueIds: string[], lawIds: string[], facts: any[], issues: any[], laws: any[]) {
  if (factIds.length === 0 || issueIds.length === 0 || lawIds.length === 0) return false
  const factById = new Map(facts.map((fact) => [String(fact.fact_id), fact]))
  const issueById = new Map(issues.map((issue) => [String(issue.issue_id), issue]))
  const lawById = new Map(laws.map((law) => [String(law.law_id), law]))
  const selectedFacts = factIds.map((id) => factById.get(id)).filter(Boolean)
  const selectedIssues = issueIds.map((id) => issueById.get(id)).filter(Boolean)
  const selectedLaws = lawIds.map((id) => lawById.get(id)).filter(Boolean)
  if (selectedFacts.length !== factIds.length || selectedIssues.length !== issueIds.length || selectedLaws.length !== lawIds.length) return false
  if (!selectedFacts.every((fact) => classifyFactConcept(fact)[issueType])) return false
  if (!selectedIssues.every((issue) => inferIssueTypeFromFacts(issueSourceFacts(issue)) === issueType)) return false
  const selectedIssueIdSet = new Set(issueIds)
  const linkedFactIds = new Set(selectedIssues.flatMap((issue) => issueSourceFacts(issue).map((fact: any) => String(fact.fact_id))))
  if (factIds.some((id) => !linkedFactIds.has(id))) return false
  for (const law of selectedLaws) {
    const sourceIssueIds = lawSourceIssueIds(law)
    if (sourceIssueIds.length === 0 || sourceIssueIds.some((id) => !selectedIssueIdSet.has(id))) return false
    const types = Array.from(new Set(sourceIssueIds.map((id) => inferIssueTypeFromFacts(issueSourceFacts(issueById.get(id)))).filter(Boolean)))
    if (types.length !== 1 || types[0] !== issueType) return false
  }
  return true
}

export function normalizeArgumentSuggestionsForDrafts(suggestions: any[], facts: any[], issues: any[], laws: any[]): ArgumentDraftInput[] {
  if (!Array.isArray(suggestions)) return []
  const candidates = suggestions.flatMap((suggestion) => {
    const title = String(suggestion?.title || suggestion?.name || '').trim()
    const issueType = String(suggestion?.issue_type || '').trim() as IssueConcept
    if (!title || !ISSUE_CONCEPT_ORDER.includes(issueType)) return []
    const source_fact_ids = explicitIds(suggestion, facts, 'fact_id', ['source_fact_ids', 'fact_ids'])
    const source_issue_ids = explicitIds(suggestion, issues, 'issue_id', ['source_issue_ids', 'issue_ids'])
    const source_law_ids = explicitIds(suggestion, laws, 'law_id', ['source_law_ids', 'law_ids'])
    if (!validateArgumentSourceClosure(issueType, source_fact_ids, source_issue_ids, source_law_ids, facts, issues, laws)) return []
    return [{
      title,
      position: String(suggestion?.position || suggestion?.point || suggestion?.claim || ''),
      reasoning: String(suggestion?.reasoning || suggestion?.description || ''),
      counter_argument: String(suggestion?.counter_argument || suggestion?.counterargument || ''),
      response: String(suggestion?.response || suggestion?.rebuttal || ''),
      risk: String(suggestion?.risk || suggestion?.risk_note || suggestion?.weakness || ''),
      conclusion: String(suggestion?.conclusion || ''),
      confidence: clampConfidence(suggestion?.confidence),
      ai_reasoning: String(suggestion?.ai_reasoning || suggestion?.reasoning_note || ''),
      source_fact_ids,
      source_issue_ids,
      source_law_ids,
      issue_type: issueType,
    }]
  }).sort((left, right) => ISSUE_CONCEPT_ORDER.indexOf(left.issue_type!) - ISSUE_CONCEPT_ORDER.indexOf(right.issue_type!))

  const byType = new Map<IssueConcept, ArgumentDraftInput>()
  for (const candidate of candidates) {
    const existing = byType.get(candidate.issue_type!)
    if (existing) {
      existing.source_fact_ids = uniqueStrings([...existing.source_fact_ids, ...candidate.source_fact_ids]).sort()
      existing.source_issue_ids = uniqueStrings([...existing.source_issue_ids, ...candidate.source_issue_ids]).sort()
      existing.source_law_ids = uniqueStrings([...existing.source_law_ids, ...candidate.source_law_ids]).sort()
    } else {
      byType.set(candidate.issue_type!, candidate)
    }
  }
  return ISSUE_CONCEPT_ORDER.map((type) => byType.get(type)).filter(Boolean) as ArgumentDraftInput[]
}

export class ArgumentDraftService {
  constructor(private prisma: PrismaClient) {}

  async listDrafts(matter_id: string): Promise<ArgumentDraftRow[]> {
    return this.prisma.argumentDraft.findMany({
      where: { matter_id },
      orderBy: { created_at: 'asc' },
    })
  }

  async generateDrafts(matter_id: string): Promise<ArgumentDraftGenerateResult> {
    const existing = await this.prisma.argumentDraft.findMany({
      where: { matter_id, published_at: null },
      orderBy: { created_at: 'asc' },
    })
    if (existing.length > 0) {
      return { status: 'argument_draft_ready', idempotent: true, argument_drafts: existing, ai_audit: null }
    }

    const [facts, issues, laws] = await Promise.all([
      this.prisma.fact.findMany({ where: { matter_id, status: { not: 'rejected' } }, orderBy: { created_at: 'asc' } }),
      this.prisma.issue.findMany({ where: { matter_id, status: { not: 'rejected' } }, orderBy: { created_at: 'asc' }, include: { facts: { include: { fact: true } } } }),
      this.prisma.law.findMany({ where: { matter_id, status: { not: 'rejected' } }, orderBy: { created_at: 'asc' }, include: { issues: true } }),
    ])
    if (laws.length === 0) {
      const error = new Error('formal_laws_required')
      ;(error as any).code = 'formal_laws_required'
      throw error
    }

    const AIService = (await import('./ai/AIService')).default
    const ai = new AIService(this.prisma)
    const suggestions = await ai.analyzeArguments(matter_id)
    const drafts = normalizeArgumentSuggestionsForDrafts(suggestions, facts, issues, laws)
    if (drafts.length === 0) {
      const error = new Error('argument_draft_empty')
      ;(error as any).code = 'argument_draft_empty'
      throw error
    }

    const created = await this.prisma.$transaction(async (tx: any) => {
      const rows = []
      for (const draft of drafts) {
        rows.push(await tx.argumentDraft.create({
          data: {
            matter_id,
            title: draft.title,
            position: draft.position || '',
            reasoning: draft.reasoning || '',
            counter_argument: draft.counter_argument || '',
            response: draft.response || '',
            risk: draft.risk || '',
            conclusion: draft.conclusion || '',
            confidence: draft.confidence,
            ai_reasoning: draft.ai_reasoning || '',
            source_fact_ids: draft.source_fact_ids,
            source_issue_ids: draft.source_issue_ids,
            source_law_ids: draft.source_law_ids,
            review_status: 'pending',
          },
        }))
      }
      return rows
    })

    return { status: 'argument_draft_ready', idempotent: false, argument_drafts: created, ai_audit: ai.getLastAudit() }
  }

  async updateDraft(matter_id: string, draft_id: string, payload: Partial<ArgumentDraftInput> & { review_status?: string; lawyer_note?: string }): Promise<ArgumentDraftRow> {
    const draft = await this.prisma.argumentDraft.findUnique({ where: { id: draft_id } })
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
    if (draft.published_at || draft.published_argument_id) {
      const error = new Error('draft_already_published')
      ;(error as any).code = 'draft_already_published'
      throw error
    }

    const editableFields = ['title', 'position', 'reasoning', 'counter_argument', 'response', 'risk', 'conclusion'] as const
    const patch: any = {}
    let changesContent = false
    for (const field of editableFields) {
      if (typeof payload[field] === 'string') {
        const value = String(payload[field] || '').trim()
        if (field === 'title' && !value) {
          const error = new Error('title_required')
          ;(error as any).code = 'title_required'
          throw error
        }
        patch[field] = value
        changesContent = true
      }
    }
    if (typeof payload.ai_reasoning === 'string') patch.ai_reasoning = payload.ai_reasoning
    if (typeof payload.lawyer_note === 'string') patch.lawyer_note = payload.lawyer_note
    if (typeof payload.confidence !== 'undefined') patch.confidence = clampConfidence(payload.confidence)

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

    return this.prisma.argumentDraft.update({ where: { id: draft_id }, data: patch })
  }

  async publishDrafts(matter_id: string): Promise<ArgumentDraftPublishResult> {
    return this.prisma.$transaction(async (tx: any) => {
      const drafts = await tx.argumentDraft.findMany({ where: { matter_id }, orderBy: { created_at: 'asc' } })
      if (drafts.length === 0) {
        const error = new Error('argument_drafts_required')
        ;(error as any).code = 'argument_drafts_required'
        throw error
      }
      if (drafts.some((draft: any) => (
        !draft.published_argument_id
        && String(draft.review_status || '') !== 'ignored'
        && String(draft.review_status || '') !== 'accepted'
      ))) {
        const error = new Error('pending_argument_drafts')
        ;(error as any).code = 'pending_argument_drafts'
        throw error
      }

      const [facts, issues, laws] = await Promise.all([
        tx.fact.findMany({ where: { matter_id, status: { not: 'rejected' } } }),
        tx.issue.findMany({ where: { matter_id, status: { not: 'rejected' } }, include: { facts: { include: { fact: true } } } }),
        tx.law.findMany({ where: { matter_id, status: { not: 'rejected' } }, include: { issues: true } }),
      ])
      const validFactIds = new Set(facts.map((fact: any) => String(fact.fact_id)))
      const validIssueIds = new Set(issues.map((issue: any) => String(issue.issue_id)))
      const validLawIds = new Set(laws.map((law: any) => String(law.law_id)))
      const created_arguments: any[] = []
      let argument_fact_links = 0
      let argument_issue_links = 0
      let argument_law_links = 0
      let ignored_count = 0

      for (const draft of drafts) {
        if (String(draft.review_status) === 'ignored') {
          ignored_count += 1
          continue
        }
        if (draft.published_argument_id) {
          const existing = await tx.argument.findUnique({ where: { argument_id: draft.published_argument_id } })
          if (!existing) {
            const error = new Error('published_argument_not_found')
            ;(error as any).code = 'published_argument_not_found'
            throw error
          }
          created_arguments.push(existing)
          continue
        }

        const factIds = uniqueStrings(Array.isArray(draft.source_fact_ids) ? draft.source_fact_ids : [])
        const issueIds = uniqueStrings(Array.isArray(draft.source_issue_ids) ? draft.source_issue_ids : [])
        const lawIds = uniqueStrings(Array.isArray(draft.source_law_ids) ? draft.source_law_ids : [])
        if (factIds.length === 0 || factIds.some((id) => !validFactIds.has(id))) {
          const error = new Error('invalid_source_fact_ids')
          ;(error as any).code = 'invalid_source_fact_ids'
          throw error
        }
        if (issueIds.length === 0 || issueIds.some((id) => !validIssueIds.has(id))) {
          const error = new Error('invalid_source_issue_ids')
          ;(error as any).code = 'invalid_source_issue_ids'
          throw error
        }
        if (lawIds.length === 0 || lawIds.some((id) => !validLawIds.has(id))) {
          const error = new Error('invalid_source_law_ids')
          ;(error as any).code = 'invalid_source_law_ids'
          throw error
        }
        const sourceIssues = issueIds.map((id) => issues.find((issue: any) => String(issue.issue_id) === id))
        const sourceTypes = Array.from(new Set(sourceIssues.map((issue: any) => inferIssueTypeFromFacts(issueSourceFacts(issue))).filter(Boolean)))
        if (sourceTypes.length !== 1 || !validateArgumentSourceClosure(sourceTypes[0] as IssueConcept, factIds, issueIds, lawIds, facts, issues, laws)) {
          const error = new Error('invalid_source_issue_ids')
          ;(error as any).code = 'invalid_source_issue_ids'
          throw error
        }


        assertFormalArgumentContent(draft)

        const argument_id = `arg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        const argument = await tx.argument.create({
          data: {
            argument_id,
            matter_id,
            issue_id: issueIds[0] || null,
            title: draft.title,
            description: composeDescription(draft),
            conclusion: draft.conclusion || '',
            status: 'active',
          },
        })
        for (const factId of factIds) {
          await tx.argumentFact.create({ data: { argument_id: argument.argument_id, fact_id: factId } })
          argument_fact_links += 1
        }
        for (const issueId of issueIds) {
          await tx.argumentIssue.create({ data: { argument_id: argument.argument_id, issue_id: issueId } })
          argument_issue_links += 1
        }
        for (const lawId of lawIds) {
          await tx.argumentLaw.create({ data: { argument_id: argument.argument_id, law_id: lawId } })
          argument_law_links += 1
        }
        await tx.argumentDraft.update({
          where: { id: draft.id },
          data: { published_argument_id: argument.argument_id, published_at: new Date() },
        })
        created_arguments.push(argument)
      }

      return {
        status: 'arguments_published' as const,
        matter_id,
        created_arguments,
        argument_fact_links,
        argument_issue_links,
        argument_law_links,
        ignored_count,
      }
    })
  }

}

export default ArgumentDraftService
