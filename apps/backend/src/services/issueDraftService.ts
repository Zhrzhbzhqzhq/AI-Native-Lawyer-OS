import type { PrismaClient } from '@lawdesk/database'
import IssueService from './issueService'
import AIService from './ai/AIService'
import type { AIAudit } from './ai/aiAudit'
import { classifyFactConcept, ISSUE_CONCEPT_ORDER, type IssueConcept } from './ai/legalConceptClassifier'
import { findIssueBoundaryViolation, validateIssues } from './ai/AIOutputValidator'

type IssueDraftInput = {
  title: string
  description?: string
  confidence?: number | null
  ai_reasoning?: string
  source_fact_ids: string[]
  issue_type?: IssueConcept
}

export type IssueDraftRow = {
  id: string
  matter_id: string
  title: string
  description: string | null
  confidence: number | null
  ai_reasoning: string | null
  source_fact_ids: unknown
  review_status: string
  lawyer_note: string | null
  published_issue_id: string | null
  published_at: Date | null
  created_at: Date
  updated_at: Date
}

type IssueDraftGenerateResult = {
  status: 'issue_draft_ready'
  idempotent: boolean
  issue_drafts: IssueDraftRow[]
  warnings?: string[]
  ai_audit: AIAudit | null
}

type IssueDraftPublishResult = {
  status: 'issues_published'
  matter_id: string
  created_issues: any[]
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

const FORMAL_ISSUE_FORBIDDEN_PATTERNS = [
  /source_fact_ids/i,
  /confidence/i,
  /ai_reasoning/i,
  /review_status/i,
  /published_issue_id/i,
  /UUID/i,
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
]

const UNSUPPORTED_CONCEPT_RULES = [
  {
    name: 'spouse_joint_debt',
    mention: /(夫妻共同债务|共同债务|配偶|夫妻|婚姻|家庭共同生活)/,
    support: /(夫妻|配偶|共同债务|共同借款|共同签署|共同生活|家庭共同生活|婚姻)/,
  },
  {
    name: 'guarantee',
    mention: /(保证责任|保证人|担保责任|担保人|连带保证|抵押|质押|担保)/,
    support: /(保证责任|保证人|保证|担保责任|担保人|连带保证|抵押|质押|担保)/,
  },
  {
    name: 'company_affiliation',
    mention: /(关联公司|实际控制人|法定代表人|公司|股东|企业|法人)/,
    support: /(关联公司|实际控制人|法定代表人|公司|股东|企业|法人)/,
  },
  {
    name: 'fund_commingling',
    mention: /(资金混同|账户混同|混同)/,
    support: /(资金混同|账户混同|混同)/,
  },
  {
    name: 'third_party',
    mention: /(第三人|第三方|第三人担保|代偿|代付)/,
    support: /(第三人|第三方|第三人担保|代偿|代付)/,
  },
  {
    name: 'repayment_defense',
    mention: /(现金清偿|抵账清偿|清偿方式|抵销|已清偿|已还清|以物抵债)/,
    support: /(现金清偿|抵账清偿|清偿方式|抵销|已清偿|已还清|以物抵债|现金还款|抵账|清偿)/,
  },
]

function normalizeIssueFingerprint(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[，。！？；：、,.!?;:\s"'“”‘’（）()《》【】\[\]{}]/g, '')
    .replace(/是否/g, '')
    .replace(/如何认定/g, '')
    .replace(/应如何承担/g, '')
    .replace(/应如何/g, '')
    .replace(/能否/g, '')
    .replace(/问题$/g, '')
    .trim()
}

function similarity(a: string, b: string) {
  const left = new Set(Array.from(a))
  const right = new Set(Array.from(b))
  if (left.size === 0 || right.size === 0) return 0
  let intersection = 0
  for (const item of left) {
    if (right.has(item)) intersection += 1
  }
  return intersection / (left.size + right.size - intersection)
}

function getExplicitSourceFactIds(suggestion: any) {
  return uniqueStrings([
    ...(Array.isArray(suggestion?.source_fact_ids) ? suggestion.source_fact_ids : []),
    ...(Array.isArray(suggestion?.fact_ids) ? suggestion.fact_ids : []),
  ])
}

function getSourceFactIds(suggestion: any, facts: any[]) {
  const validFactIds = new Set(facts.map((fact) => String(fact.fact_id)))
  if (Array.isArray(suggestion?.fact_titles)) {
    const factTitles = uniqueStrings(suggestion.fact_titles)
    if (factTitles.length === 0) return { ids: [], invalid: [], missing: true }
    const matched = factTitles.map((title) => facts.find((fact) => String(fact.title || '').trim() === title))
    const invalid = factTitles.filter((_, index) => !matched[index])
    return {
      ids: invalid.length > 0 ? [] : uniqueStrings(matched.map((fact: any) => fact.fact_id)),
      invalid,
      missing: false,
    }
  }

  const explicit = getExplicitSourceFactIds(suggestion)
  if (explicit.length === 0) return { ids: [], invalid: [], missing: true }
  const invalid = explicit.filter((id) => !validFactIds.has(id))

  return {
    ids: invalid.length ? [] : explicit,
    invalid,
    missing: false,
  }
}

function unsupportedConceptWarnings(candidateText: string, relatedFactsText: string) {
  const warnings: string[] = []
  for (const rule of UNSUPPORTED_CONCEPT_RULES) {
    if (rule.mention.test(candidateText) && !rule.support.test(relatedFactsText)) {
      warnings.push(`unsupported_concept:${rule.name}`)
    }
  }
  return warnings
}

function issueConceptFromSuggestion(suggestion: any): IssueConcept | null {
  const explicit = String(suggestion?.issue_type || '').trim()
  if (ISSUE_CONCEPT_ORDER.includes(explicit as IssueConcept)) return explicit as IssueConcept
  return null
}

function factsSupportIssueConcept(concept: IssueConcept, facts: any[]) {
  return facts.length > 0 && facts.every((fact) => classifyFactConcept(fact)[concept])
}

function assertFormalIssueClean(title: string, description: string) {
  const combined = `${title}\n${description}`
  if (FORMAL_ISSUE_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(combined))) {
    const error = new Error('unsafe_formal_issue_content')
    ;(error as any).code = 'unsafe_formal_issue_content'
    throw error
  }
  if (findIssueBoundaryViolation(title, description)) {
    const error = new Error('issue_contains_legal_conclusion')
    ;(error as any).code = 'issue_contains_legal_conclusion'
    throw error
  }
}

export function normalizeIssueSuggestionsForDrafts(
  suggestions: any[],
  facts: any[],
  maxDrafts = 5,
  evidenceBackedFactIds?: Set<string>,
): { drafts: IssueDraftInput[]; warnings: string[] } {
  if (!Array.isArray(suggestions)) return { drafts: [], warnings: ['suggestions_not_array'] }
  const factById = new Map(facts.map((fact) => [String(fact.fact_id), fact]))
  const warnings: string[] = []
  const candidates: IssueDraftInput[] = []

  suggestions.forEach((suggestion, index) => {
    const title = String(suggestion?.title || suggestion?.name || '').trim()
    if (!title) {
      warnings.push(`candidate_${index}:missing_title`)
      return
    }
    let sourceResult = getSourceFactIds(suggestion, facts)

    if (sourceResult.missing) {
      warnings.push(`candidate_${index}:missing_source_fact_ids`)
      return
    }
    if (sourceResult.invalid.length > 0) {
      console.log('[ISSUE FACT LINK FAILED]', {
        issue_title: title,
        fact_titles: Array.isArray(suggestion?.fact_titles) ? suggestion.fact_titles : [],
        unmatched_fact_titles: sourceResult.invalid,
      })
      warnings.push(`candidate_${index}:invalid_source_fact_ids`)
      return
    }
    if (evidenceBackedFactIds && sourceResult.ids.some((id) => !evidenceBackedFactIds.has(id))) {
      warnings.push(`candidate_${index}:source_fact_without_evidence`)
      return
    }
    const validation = validateIssues([{
      ...suggestion,
      title,
      description: suggestion?.description || suggestion?.reason,
      ai_reasoning: suggestion?.ai_reasoning || suggestion?.reasoning || suggestion?.reason || '该争点需要结合所引事实进一步审查。',
      confidence: typeof suggestion?.confidence === 'number' ? suggestion.confidence : 0.9,
    }])
    if (!validation.ok) {
      warnings.push(...validation.errors.map((error) => `candidate_${index}:${error}`))
      return
    }
    console.log('[ISSUE FACT LINK DEBUG]', {
      issue_title: title,
      fact_titles: Array.isArray(suggestion?.fact_titles) ? suggestion.fact_titles : [],
      source_fact_ids: sourceResult.ids,
    })
    const relatedFacts = sourceResult.ids.map((id) => factById.get(id)).filter(Boolean)
    const relatedFactsText = relatedFacts.map((fact: any) => `${fact.title || ''}\n${fact.description || ''}`).join('\n')
    const description = String(suggestion?.description || suggestion?.reason || '').trim()
    const ai_reasoning = String(suggestion?.ai_reasoning || suggestion?.reasoning || suggestion?.reason || '').trim()
    const candidateText = `${title}\n${description}\n${ai_reasoning}`
    const conceptWarnings = unsupportedConceptWarnings(candidateText, relatedFactsText)
    if (conceptWarnings.length > 0) {
      warnings.push(...conceptWarnings.map((warning) => `candidate_${index}:${warning}`))
      return
    }
    const issueType = issueConceptFromSuggestion(suggestion)
    if (issueType && !factsSupportIssueConcept(issueType, relatedFacts)) {
      warnings.push(`candidate_${index}:source_fact_concept_mismatch:${issueType}`)
      return
    }
    candidates.push({
      title,
      description,
      confidence: clampConfidence(suggestion?.confidence),
      ai_reasoning,
      source_fact_ids: sourceResult.ids,
      issue_type: issueType || undefined,
    })
  })

  const sorted = candidates.sort((a, b) => {
    const coverage = b.source_fact_ids.length - a.source_fact_ids.length
    if (coverage !== 0) return coverage
    return (b.confidence || 0) - (a.confidence || 0)
  })
  const deduped: IssueDraftInput[] = []
  const fingerprints: string[] = []
  for (const candidate of sorted) {
    const fingerprint = normalizeIssueFingerprint(`${candidate.title}\n${candidate.description}`)
    const existingIndex = fingerprints.findIndex((existing) => existing === fingerprint || similarity(existing, fingerprint) >= 0.82)
    if (existingIndex >= 0) {
      warnings.push(`candidate_duplicate:${candidate.title}`)
      const existing = deduped[existingIndex]
      existing.source_fact_ids = uniqueStrings([...existing.source_fact_ids, ...candidate.source_fact_ids])
      if ((candidate.confidence || 0) > (existing.confidence || 0)) existing.confidence = candidate.confidence
      continue
    }
    deduped.push(candidate)
    fingerprints.push(fingerprint)
  }
  if (deduped.length > maxDrafts) warnings.push(`truncated:${deduped.length}->${maxDrafts}`)
  return { drafts: deduped.slice(0, maxDrafts), warnings }
}

export class IssueDraftService {
  constructor(private prisma: PrismaClient) {}

  async listDrafts(matter_id: string): Promise<IssueDraftRow[]> {
    return this.prisma.issueDraft.findMany({
      where: { matter_id },
      orderBy: { created_at: 'asc' },
    })
  }

  async generateDrafts(matter_id: string): Promise<IssueDraftGenerateResult> {
    const existing = await this.prisma.issueDraft.findMany({
      where: { matter_id, published_at: null },
      orderBy: { created_at: 'asc' },
    })
    if (existing.length > 0) {
      return { status: 'issue_draft_ready', idempotent: true, issue_drafts: existing, ai_audit: null }
    }

    const facts = await this.prisma.fact.findMany({
      where: { matter_id, status: { not: 'rejected' } },
      orderBy: { created_at: 'asc' },
    })
    if (facts.length === 0) {
      const error = new Error('formal_facts_required')
      ;(error as any).code = 'formal_facts_required'
      throw error
    }
    const factIds = facts.map((fact: any) => String(fact.fact_id))
    const factEvidenceLinks = await this.prisma.factEvidence.findMany({
      where: { fact_id: { in: factIds } },
      include: { evidence: true },
    })
    const evidenceBackedFactIds = new Set(
      factEvidenceLinks
        .filter((link: any) => String(link.evidence?.matter_id || '') === String(matter_id) && String(link.evidence?.status || '') !== 'rejected')
        .map((link: any) => String(link.fact_id)),
    )

    const ai = new AIService(this.prisma)
    const suggestions = await ai.analyzeIssues(matter_id)
    console.log('[ISSUE RAW SUGGESTIONS]', JSON.stringify(suggestions, null, 2))

    const normalized = normalizeIssueSuggestionsForDrafts(suggestions, facts, 5, evidenceBackedFactIds)

    console.log('[ISSUE NORMALIZED]', JSON.stringify(normalized, null, 2))

    const drafts = normalized.drafts
    if (drafts.length === 0) {
      const error = new Error('issue_draft_empty')
      ;(error as any).code = 'issue_draft_empty'
      throw error
    }

    const created = await this.prisma.$transaction(async (tx: any) => {
      const rows = []
      for (const draft of drafts) {
        rows.push(await tx.issueDraft.create({
          data: {
            matter_id,
            title: draft.title,
            description: draft.description || '',
            confidence: draft.confidence,
            ai_reasoning: draft.ai_reasoning || '',
            source_fact_ids: JSON.stringify(draft.source_fact_ids),
            review_status: 'pending',
          },
        }))
      }
      return rows
    })

    return { status: 'issue_draft_ready', idempotent: false, issue_drafts: created, warnings: normalized.warnings, ai_audit: ai.getLastAudit() }
  }

  async updateDraft(matter_id: string, draft_id: string, payload: { title?: string; description?: string; review_status?: string; lawyer_note?: string }): Promise<IssueDraftRow> {
    const draft = await this.prisma.issueDraft.findUnique({ where: { id: draft_id } })
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
    if (draft.published_at || draft.published_issue_id) {
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

    return this.prisma.issueDraft.update({ where: { id: draft_id }, data: patch })
  }

  async publishDrafts(matter_id: string): Promise<IssueDraftPublishResult> {
    return this.prisma.$transaction(async (tx: any) => {
      const drafts = await tx.issueDraft.findMany({
        where: { matter_id },
        orderBy: { created_at: 'asc' },
      })
      if (drafts.length === 0) {
        const error = new Error('issue_drafts_required')
        ;(error as any).code = 'issue_drafts_required'
        throw error
      }

      const unconfirmed = drafts.filter((draft: any) => (
        !draft.published_issue_id
        && String(draft.review_status || '') !== 'ignored'
        && String(draft.review_status || '') !== 'accepted'
      ))
      if (unconfirmed.length > 0) {
        const error = new Error('pending_issue_drafts')
        ;(error as any).code = 'pending_issue_drafts'
        throw error
      }

      const validFacts = await tx.fact.findMany({ where: { matter_id, status: { not: 'rejected' } } })
      const validFactIds = new Set(validFacts.map((fact: any) => String(fact.fact_id)))
      const validFactById = new Map(validFacts.map((fact: any) => [String(fact.fact_id), fact]))
      const validFactEvidenceLinks = await tx.factEvidence.findMany({
        where: { fact_id: { in: Array.from(validFactIds) } },
        include: { evidence: true },
      })
      const evidenceBackedFactIds = new Set(
        validFactEvidenceLinks
          .filter((link: any) => String(link.evidence?.matter_id || '') === String(matter_id) && String(link.evidence?.status || '') !== 'rejected')
          .map((link: any) => String(link.fact_id)),
      )
      const issueService = new IssueService(tx)
      const created_issues: any[] = []
      let links_count = 0
      let ignored_count = 0

      for (const draft of drafts) {
        if (String(draft.review_status) === 'ignored') {
          ignored_count += 1
          continue
        }

        if (draft.published_issue_id) {
          const existing = await tx.issue.findUnique({ where: { issue_id: draft.published_issue_id } })
          if (!existing) {
            const error = new Error('published_issue_not_found')
            ;(error as any).code = 'published_issue_not_found'
            throw error
          }
          created_issues.push(existing)
          continue
        }

        const sourceRaw = draft.source_fact_ids
        const sourceIds = uniqueStrings(
          Array.isArray(sourceRaw)
            ? sourceRaw
            : (() => {
                try {
                  const parsed = JSON.parse(String(sourceRaw || '[]'))
                  return Array.isArray(parsed) ? parsed : []
                } catch {
                  return []
                }
              })()
        )

        console.log('[ISSUE PUBLISH SOURCE]', {
          raw: draft.source_fact_ids,
          parsed: sourceIds,
          type: typeof draft.source_fact_ids
        })
        if (sourceIds.length === 0 || sourceIds.some((id) => !validFactIds.has(id))) {
          const error = new Error('invalid_source_fact_ids')
          ;(error as any).code = 'invalid_source_fact_ids'
          throw error
        }
        if (sourceIds.some((id) => !evidenceBackedFactIds.has(id))) {
          const error = new Error('source_fact_without_evidence')
          ;(error as any).code = 'source_fact_without_evidence'
          throw error
        }
        const issueType = issueConceptFromSuggestion(draft)
        const sourceFacts = sourceIds.map((id) => validFactById.get(id)).filter(Boolean)

        assertFormalIssueClean(String(draft.title || ''), String(draft.description || ''))

        const issue = await issueService.createIssue(matter_id, {
          title: draft.title,
          description: draft.description || '',
          status: 'active',
          priority: 'medium',
        })
        console.log('[ISSUE FACT LINK DEBUG]', {
          issue_title: issue.title,
          linked_fact_titles: sourceIds.map((factId) => (validFactById.get(factId) as any)?.title).filter(Boolean),
        })
        for (const factId of sourceIds) {
          const existing = await tx.issueFact.findFirst({ where: { issue_id: issue.issue_id, fact_id: factId } })
          if (existing) continue
          await issueService.attachFactToIssue(matter_id, issue.issue_id, factId, 'from_issue_draft')
          links_count += 1
        }
        await tx.issueDraft.update({
          where: { id: draft.id },
          data: {
            published_issue_id: issue.issue_id,
            published_at: new Date(),
          },
        })
        created_issues.push(issue)
      }

      return {
        status: 'issues_published' as const,
        matter_id,
        created_issues,
        links_count,
        ignored_count,
      }
    })
  }

}

export default IssueDraftService
