import type { PrismaClient } from '@lawdesk/database'
import type { AIAudit } from './ai/aiAudit'
import { inferIssueTypeFromFacts, ISSUE_CONCEPT_ORDER, type IssueConcept } from './ai/legalConceptClassifier'
import { findLawBoundaryViolation, findLawCitationViolation, validateLaws } from './ai/AIOutputValidator'
import { formatFormalLawForDisplay, parseFormalLaw, serializeFormalLawV2 } from './formalSemanticCodec'

type LawDraftInput = {
  title: string
  citation?: string
  rule_content?: string
  application?: string
  limitations?: string
  jurisdiction?: string
  source_reference?: string
  confidence?: number | null
  ai_reasoning?: string
  source_issue_ids: string[]
  issue_type?: IssueConcept | 'general'
}

export type LawDraftRow = {
  id: string
  matter_id: string
  title: string
  citation: string | null
  rule_content: string | null
  application: string | null
  limitations: string | null
  jurisdiction: string | null
  source_reference: string | null
  confidence: number | null
  ai_reasoning: string | null
  source_issue_ids: unknown
  review_status: string
  lawyer_note: string | null
  published_law_id: string | null
  published_at: Date | null
  created_at: Date
  updated_at: Date
}

type LawDraftGenerateResult = {
  status: 'law_draft_ready'
  idempotent: boolean
  law_drafts: LawDraftRow[]
  ai_audit: AIAudit | null
}

type LawDraftPublishResult = {
  status: 'laws_published'
  matter_id: string
  created_laws: any[]
  links_count: number
  ignored_count: number
}

const REVIEW_STATUSES = ['pending', 'accepted', 'edited', 'ignored'] as const

const FORMAL_LAW_FORBIDDEN_PATTERNS = [
  /第\s*[xyｘｙ]\s*条/i,
  /\bTODO\b/i,
  /\bplaceholder\b/i,
  /待补充/,
  /\bprompt\b/i,
  /ai_reasoning/i,
  /source_issue_ids/i,
  /review_status/i,
  /published_law_id/i,
  /\b(?:mat|issue|law)-[a-z0-9-]+\b/i,
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
]

function uniqueStrings(values: unknown[]) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
}

function parseSourceIssueIds(value: unknown) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch (_) {
    return value
  }
}

function clampConfidence(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return null
  return Math.max(0, Math.min(1, number))
}

export function assertFormalLawContent(draft: { title?: unknown; citation?: unknown; rule_content?: unknown; application?: unknown; limitations?: unknown; jurisdiction?: unknown; source_reference?: unknown }) {
  const title = String(draft.title || '').trim()
  const citation = String(draft.citation || '').trim()
  const ruleContent = String(draft.rule_content || '').trim()
  if (!title || !citation || !ruleContent) {
    const error = new Error('formal_law_content_required')
    ;(error as any).code = 'formal_law_content_required'
    throw error
  }
  const formalContent = [title, citation, ruleContent, draft.application, draft.limitations, draft.jurisdiction, draft.source_reference]
    .map((value) => String(value || ''))
    .join('\n')
  if (FORMAL_LAW_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(formalContent))) {
    const error = new Error('unsafe_formal_law_content')
    ;(error as any).code = 'unsafe_formal_law_content'
    throw error
  }
  if (findLawCitationViolation(citation)) {
    const error = new Error('unsafe_law_citation')
    ;(error as any).code = 'unsafe_law_citation'
    throw error
  }
  if (findLawBoundaryViolation(draft.application, draft.limitations)) {
    const error = new Error('law_contains_final_case_conclusion')
    ;(error as any).code = 'law_contains_final_case_conclusion'
    throw error
  }
}

function getSourceIssueIds(suggestion: any, issues: any[]) {
  const validIssueIds = new Set(issues.map((issue) => String(issue.issue_id)))
  const explicit = [
    ...(Array.isArray(suggestion?.source_issue_ids) ? suggestion.source_issue_ids : []),
    ...(Array.isArray(suggestion?.issue_ids) ? suggestion.issue_ids : []),
  ]
  const ids = uniqueStrings(explicit).sort()
  if (ids.length === 0 || ids.some((id) => !validIssueIds.has(id))) return []
  return ids
}

function inferFormalIssueType(issue: any): IssueConcept | null {
  const sourceFacts = Array.isArray(issue?.facts)
    ? issue.facts.map((link: any) => link?.fact).filter(Boolean)
    : []
  return inferIssueTypeFromFacts(sourceFacts)
}

export function normalizeLawSuggestionsForDrafts(
  suggestions: any,
  issues: any[],
  evidenceBackedIssueIds?: Set<string>,
): LawDraftInput[] {
  const suggestionList: any[] = Array.isArray(suggestions)
    ? suggestions
    : Array.isArray(suggestions?.laws)
      ? suggestions.laws
      : Array.isArray(suggestions?.suggestions)
        ? suggestions.suggestions
        : []

  console.log('[LAW NORMALIZE DEBUG]', {
    suggestion_count: suggestionList.length,
    first_suggestion: suggestionList[0],
    title: suggestionList[0]?.title,
    issue_title: suggestionList[0]?.issue_title,
    issue_type: suggestionList[0]?.issue_type,
    source_issue_ids: suggestionList[0]?.source_issue_ids,
  })

  const issueById = new Map(issues.map((issue) => [String(issue.issue_id), issue]))
  const candidates = suggestionList.flatMap((suggestion: any) => {
    const title = String(suggestion?.title || suggestion?.name || '').trim()

    if (!title) return []

    const explicitSourceIssueIds = uniqueStrings([
      ...(Array.isArray(suggestion?.source_issue_ids) ? suggestion.source_issue_ids : []),
      ...(Array.isArray(suggestion?.issue_ids) ? suggestion.issue_ids : []),
    ])
    let source_issue_ids = getSourceIssueIds(suggestion, issues)

    if (explicitSourceIssueIds.length > 0) {
      if (source_issue_ids.length !== 1) return []
      // A validated formal Issue ID is authoritative. This preserves deterministic
      // test candidates while still preventing cross-Matter or multi-Issue links.
    } else if (typeof suggestion?.issue_title === 'string' && suggestion.issue_title.trim()) {
      const issueTitle = suggestion.issue_title.trim()
      const matched = issues.find((issue: any) => String(issue.title || '').trim() === issueTitle)
      if (!matched) {
        console.log('[LAW ISSUE LINK FAILED]', {
          law_title: title,
          issue_title: issueTitle,
        })
        return []
      }
      source_issue_ids = [String(matched.issue_id)]
    } else if (source_issue_ids.length !== 1) {
      console.log('[LAW ISSUE LINK FAILED]', {
        law_title: title,
        issue_title: suggestion?.issue_title,
      })
      return []
    }
    if (evidenceBackedIssueIds && !evidenceBackedIssueIds.has(source_issue_ids[0])) return []

    const matchedIssue = issueById.get(source_issue_ids[0]) as any
    const validation = validateLaws([{
      ...suggestion,
      issue_title: String(suggestion?.issue_title || matchedIssue?.title || '').trim(),
    }])
    if (!validation.ok) return []

    const explicitIssueType = String(suggestion?.issue_type || '').trim() as IssueConcept
    const inferredIssueType = inferFormalIssueType(issueById.get(source_issue_ids[0]))
    if (ISSUE_CONCEPT_ORDER.includes(explicitIssueType) && inferredIssueType && explicitIssueType !== inferredIssueType) return []
    const issueType = ISSUE_CONCEPT_ORDER.includes(explicitIssueType) ? explicitIssueType : inferredIssueType


    return [{
      title,
      citation: String(suggestion?.citation || suggestion?.article || suggestion?.ref || '').trim(),
      rule_content: String(suggestion?.rule_content || suggestion?.content || '').trim(),
      application: String(suggestion?.application || suggestion?.applicability || suggestion?.reason || '').trim(),
      limitations: String(suggestion?.limitations || suggestion?.risk || suggestion?.risks || '').trim(),
      jurisdiction: String(suggestion?.jurisdiction || '中国大陆').trim(),
      source_reference: String(suggestion?.source_reference || suggestion?.source_url || suggestion?.source || '').trim(),
      confidence: clampConfidence(suggestion?.confidence),
      ai_reasoning: String(suggestion?.ai_reasoning || suggestion?.reasoning || suggestion?.reason || '').trim(),
      source_issue_ids,
      issue_type: (issueType || 'general') as IssueConcept | 'general',
    }]
  }).sort((left: LawDraftInput, right: LawDraftInput) => {
    const leftOrder = ISSUE_CONCEPT_ORDER.indexOf(left.issue_type as IssueConcept)
    const rightOrder = ISSUE_CONCEPT_ORDER.indexOf(right.issue_type as IssueConcept)
    const typeOrder = (leftOrder < 0 ? ISSUE_CONCEPT_ORDER.length : leftOrder) - (rightOrder < 0 ? ISSUE_CONCEPT_ORDER.length : rightOrder)
    if (typeOrder !== 0) return typeOrder
    return `${left.title}\n${left.citation}`.localeCompare(`${right.title}\n${right.citation}`)
  })

  return candidates
}

export class LawDraftService {
  constructor(private prisma: PrismaClient) {}

  async listDrafts(matter_id: string): Promise<LawDraftRow[]> {
    const drafts = await this.prisma.lawDraft.findMany({
      where: { matter_id },
      orderBy: { created_at: 'asc' },
    })
    return drafts.map((draft: any) => ({
      ...draft,
      source_issue_ids: parseSourceIssueIds(draft.source_issue_ids),
    }))
  }

  async generateDrafts(matter_id: string): Promise<LawDraftGenerateResult> {
    const existing = await this.prisma.lawDraft.findMany({
      where: { matter_id, published_at: null },
      orderBy: { created_at: 'asc' },
    })
    if (existing.length > 0) {
      return {
        status: 'law_draft_ready',
        idempotent: true,
        law_drafts: existing.map((draft: any) => ({
          ...draft,
          source_issue_ids: parseSourceIssueIds(draft.source_issue_ids),
        })),
        ai_audit: null,
      }
    }

    const issues = await this.prisma.issue.findMany({
      where: { matter_id, status: { not: 'rejected' } },
      orderBy: { created_at: 'asc' },
      include: { facts: { include: { fact: true } } },
    })
    if (issues.length === 0) {
      const error = new Error('formal_issues_required')
      ;(error as any).code = 'formal_issues_required'
      throw error
    }
    const sourceFactIds = uniqueStrings(issues.flatMap((issue: any) => (
      Array.isArray(issue.facts) ? issue.facts.map((link: any) => link?.fact?.fact_id) : []
    )))
    const factEvidenceLinks = sourceFactIds.length > 0
      ? await this.prisma.factEvidence.findMany({ where: { fact_id: { in: sourceFactIds } }, include: { evidence: true } })
      : []
    const evidenceBackedFactIds = new Set(
      factEvidenceLinks
        .filter((link: any) => String(link.evidence?.matter_id || '') === String(matter_id) && String(link.evidence?.status || '') !== 'rejected')
        .map((link: any) => String(link.fact_id)),
    )
    const evidenceBackedIssueIds = new Set(
      issues
        .filter((issue: any) => {
          const factIds = uniqueStrings(Array.isArray(issue.facts) ? issue.facts.map((link: any) => link?.fact?.fact_id) : [])
          return factIds.length > 0 && factIds.every((factId) => evidenceBackedFactIds.has(factId))
        })
        .map((issue: any) => String(issue.issue_id)),
    )

    const AIService = (await import('./ai/AIService')).default
    const ai = new AIService(this.prisma)
    const suggestions = await ai.analyzeLaws(matter_id)
    console.log('[LAW GENERATE INPUT]', {
      suggestions_type: typeof suggestions,
      is_array: Array.isArray(suggestions),
      keys: suggestions && typeof suggestions === 'object'
        ? Object.keys(suggestions)
        : [],
      length: (suggestions as any)?.length,
      first: Array.isArray(suggestions) ? suggestions[0] : suggestions,
    })

    const normalizedSuggestions = Array.isArray(suggestions)
      ? suggestions
      : Array.isArray((suggestions as any)?.laws)
        ? (suggestions as any).laws
        : Array.isArray((suggestions as any)?.suggestions)
          ? (suggestions as any).suggestions
          : []

    const drafts = normalizeLawSuggestionsForDrafts(normalizedSuggestions, issues, evidenceBackedIssueIds)

    console.log('[LAW NORMALIZE RESULT]', {
      suggestions_count: normalizedSuggestions.length,
      issues_count: issues.length,
      drafts_count: drafts.length,
      first_suggestion: normalizedSuggestions[0],
    })
    if (drafts.length === 0) {
      const error = new Error('law_draft_empty')
      ;(error as any).code = 'law_draft_empty'
      throw error
    }

    const created = await this.prisma.$transaction(async (tx: any) => {
      const rows = []
      for (const draft of drafts) {
        rows.push(await tx.lawDraft.create({
          data: {
            matter_id,
            title: draft.title,
            citation: draft.citation || '',
            rule_content: draft.rule_content || '',
            application: draft.application || '',
            limitations: draft.limitations || '',
            jurisdiction: draft.jurisdiction || '',
            source_reference: draft.source_reference || '',
            confidence: draft.confidence,
            ai_reasoning: draft.ai_reasoning || '',
            source_issue_ids: typeof draft.source_issue_ids === 'string'
              ? draft.source_issue_ids
              : JSON.stringify(draft.source_issue_ids),
            review_status: 'pending',
          },
        }))
      }
      return rows
    })

    return {
      status: 'law_draft_ready',
      idempotent: false,
      law_drafts: created.map((draft: any) => ({
        ...draft,
        source_issue_ids: parseSourceIssueIds(draft.source_issue_ids),
      })),
      ai_audit: ai.getLastAudit(),
    }
  }

  async updateDraft(matter_id: string, draft_id: string, payload: Partial<LawDraftInput> & { review_status?: string; lawyer_note?: string }): Promise<LawDraftRow> {
    const draft = await this.prisma.lawDraft.findUnique({ where: { id: draft_id } })
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
    if (draft.published_at || draft.published_law_id) {
      const error = new Error('draft_already_published')
      ;(error as any).code = 'draft_already_published'
      throw error
    }

    const editableFields = ['title', 'citation', 'rule_content', 'application', 'limitations', 'jurisdiction', 'source_reference'] as const
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

    const updated = await this.prisma.lawDraft.update({ where: { id: draft_id }, data: patch })
    return {
      ...updated,
      source_issue_ids: parseSourceIssueIds(updated.source_issue_ids),
    }
  }

  async publishDrafts(matter_id: string): Promise<LawDraftPublishResult> {
    return this.prisma.$transaction(async (tx: any) => {
      const drafts = await tx.lawDraft.findMany({
        where: { matter_id },
        orderBy: { created_at: 'asc' },
      })
      if (drafts.length === 0) {
        const error = new Error('law_drafts_required')
        ;(error as any).code = 'law_drafts_required'
        throw error
      }

      const unconfirmed = drafts.filter((draft: any) => (
        !draft.published_law_id
        && String(draft.review_status || '') !== 'ignored'
        && String(draft.review_status || '') !== 'accepted'
      ))
      if (unconfirmed.length > 0) {
        const error = new Error('pending_law_drafts')
        ;(error as any).code = 'pending_law_drafts'
        throw error
      }

      const validIssues = await tx.issue.findMany({ where: { matter_id, status: { not: 'rejected' } } })
      const validIssueIds = new Set(validIssues.map((issue: any) => String(issue.issue_id)))
      const issueFactLinks = await tx.issueFact.findMany({
        where: { issue_id: { in: Array.from(validIssueIds) } },
        include: { fact: true },
      })
      const factIdsByIssue = new Map<string, string[]>()
      for (const link of issueFactLinks) {
        const rows = factIdsByIssue.get(String(link.issue_id)) || []
        rows.push(String(link.fact_id))
        factIdsByIssue.set(String(link.issue_id), rows)
      }
      const linkedFactIds = uniqueStrings(issueFactLinks.map((link: any) => link.fact_id))
      const factEvidenceLinks = linkedFactIds.length > 0
        ? await tx.factEvidence.findMany({ where: { fact_id: { in: linkedFactIds } }, include: { evidence: true } })
        : []
      const evidenceBackedFactIds = new Set(
        factEvidenceLinks
          .filter((link: any) => String(link.evidence?.matter_id || '') === String(matter_id) && String(link.evidence?.status || '') !== 'rejected')
          .map((link: any) => String(link.fact_id)),
      )
      const evidenceBackedIssueIds = new Set(
        validIssues
          .filter((issue: any) => {
            const factIds = uniqueStrings(factIdsByIssue.get(String(issue.issue_id)) || [])
            return factIds.length > 0 && factIds.every((factId) => evidenceBackedFactIds.has(factId))
          })
          .map((issue: any) => String(issue.issue_id)),
      )
      const created_laws: any[] = []
      let links_count = 0
      let ignored_count = 0

      for (const draft of drafts) {
        if (String(draft.review_status) === 'ignored') {
          ignored_count += 1
          continue
        }

        if (draft.published_law_id) {
          const existing = await tx.law.findUnique({ where: { law_id: draft.published_law_id } })
          if (!existing) {
            const error = new Error('published_law_not_found')
            ;(error as any).code = 'published_law_not_found'
            throw error
          }
          created_laws.push({
            ...existing,
            description: formatFormalLawForDisplay(parseFormalLaw(existing.description)),
          })
          continue
        }

        const parsedSourceIssueIds = parseSourceIssueIds(draft.source_issue_ids)
        const sourceIds = uniqueStrings(Array.isArray(parsedSourceIssueIds) ? parsedSourceIssueIds : [])
        if (sourceIds.length === 0 || sourceIds.some((id) => !validIssueIds.has(id))) {
          const error = new Error('invalid_source_issue_ids')
          ;(error as any).code = 'invalid_source_issue_ids'
          throw error
        }
        if (sourceIds.length !== 1) {
          console.log('[LAW ISSUE LINK FAILED]', {
            law_title: draft.title,
            issue_title: null,
            source_issue_ids: sourceIds,
          })
          const error = new Error('invalid_source_issue_ids')
          ;(error as any).code = 'invalid_source_issue_ids'
          throw error
        }
        if (!evidenceBackedIssueIds.has(sourceIds[0])) {
          const error = new Error('invalid_source_issue_ids')
          ;(error as any).code = 'invalid_source_issue_ids'
          throw error
        }

        assertFormalLawContent(draft)

        const law_id = `law-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        const law = await tx.law.create({
          data: {
            law_id,
            matter_id,
            issue_id: sourceIds[0] || null,
            title: draft.title,
            citation: draft.citation || '',
            description: serializeFormalLawV2({
              rule_content: String(draft.rule_content || ''),
              application: String(draft.application || ''),
              limitations: String(draft.limitations || ''),
              jurisdiction: String(draft.jurisdiction || ''),
              source_reference: String(draft.source_reference || ''),
            }),
            status: 'active',
          },
        })
        for (const issueId of sourceIds) {
          const existing = await tx.lawIssue.findFirst({ where: { law_id: law.law_id, issue_id: issueId } })
          if (existing) continue
          await tx.lawIssue.create({ data: { law_id: law.law_id, issue_id: issueId } })
          links_count += 1
        }
        await tx.lawDraft.update({
          where: { id: draft.id },
          data: {
            published_law_id: law.law_id,
            published_at: new Date(),
          },
        })
        created_laws.push({
          ...law,
          description: formatFormalLawForDisplay(parseFormalLaw(law.description)),
        })
      }

      return {
        status: 'laws_published' as const,
        matter_id,
        created_laws,
        links_count,
        ignored_count,
      }
    })
  }

}

export default LawDraftService
