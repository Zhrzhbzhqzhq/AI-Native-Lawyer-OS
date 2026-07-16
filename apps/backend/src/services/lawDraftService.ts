import type { PrismaClient } from '@lawdesk/database'

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
}

function composeLawDescription(draft: any) {
  const parts = [
    draft.rule_content ? `规则内容：${draft.rule_content}` : '',
    draft.application ? `本案适用说明：${draft.application}` : '',
    draft.limitations ? `限制与风险：${draft.limitations}` : '',
  ].filter(Boolean)
  return parts.join('\n')
}

function getSourceIssueIds(suggestion: any, issues: any[], index: number) {
  const validIssueIds = new Set(issues.map((issue) => String(issue.issue_id)))
  const explicit = [
    ...(Array.isArray(suggestion?.source_issue_ids) ? suggestion.source_issue_ids : []),
    ...(Array.isArray(suggestion?.issue_ids) ? suggestion.issue_ids : []),
  ]
  const explicitValid = uniqueStrings(explicit).filter((id) => validIssueIds.has(id))
  if (explicitValid.length > 0) return explicitValid

  const issueTitles = [
    ...(Array.isArray(suggestion?.issue_titles) ? suggestion.issue_titles : []),
    suggestion?.issue_title,
  ].map((title) => String(title || '').trim()).filter(Boolean)
  if (issueTitles.length > 0) {
    const lowerTitles = issueTitles.map((title) => title.toLowerCase())
    const matched = issues
      .filter((issue) => lowerTitles.some((title) => String(issue.title || '').toLowerCase().includes(title) || title.includes(String(issue.title || '').toLowerCase())))
      .map((issue) => issue.issue_id)
    if (matched.length > 0) return uniqueStrings(matched)
  }

  const text = `${suggestion?.title || ''}\n${suggestion?.citation || ''}\n${suggestion?.application || ''}\n${suggestion?.description || ''}\n${suggestion?.ai_reasoning || ''}`.toLowerCase()
  const matched = issues
    .filter((issue) => {
      const title = String(issue.title || '').toLowerCase()
      return title && text.includes(title)
    })
    .map((issue) => issue.issue_id)
  if (matched.length > 0) return uniqueStrings(matched)

  const indexed = issues[index]
  if (indexed?.issue_id) return [String(indexed.issue_id)]
  return issues[0]?.issue_id ? [String(issues[0].issue_id)] : []
}

export class LawDraftService {
  constructor(private prisma: PrismaClient) {}

  async listDrafts(matter_id: string): Promise<LawDraftRow[]> {
    return this.prisma.lawDraft.findMany({
      where: { matter_id },
      orderBy: { created_at: 'asc' },
    })
  }

  async generateDrafts(matter_id: string): Promise<LawDraftGenerateResult> {
    const existing = await this.prisma.lawDraft.findMany({
      where: { matter_id, published_at: null },
      orderBy: { created_at: 'asc' },
    })
    if (existing.length > 0) {
      return { status: 'law_draft_ready', idempotent: true, law_drafts: existing }
    }

    const issues = await this.prisma.issue.findMany({
      where: { matter_id, status: { not: 'rejected' } },
      orderBy: { created_at: 'asc' },
    })
    if (issues.length === 0) {
      const error = new Error('formal_issues_required')
      ;(error as any).code = 'formal_issues_required'
      throw error
    }

    const AIService = (await import('./ai/AIService')).default
    const ai = new AIService(this.prisma)
    const suggestions = await ai.analyzeLaws(matter_id)
    const drafts = this.normalizeSuggestions(suggestions, issues)
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
            source_issue_ids: draft.source_issue_ids,
            review_status: 'pending',
          },
        }))
      }
      return rows
    })

    return { status: 'law_draft_ready', idempotent: false, law_drafts: created }
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

    return this.prisma.lawDraft.update({ where: { id: draft_id }, data: patch })
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
          created_laws.push(existing)
          continue
        }

        const sourceIds = uniqueStrings(Array.isArray(draft.source_issue_ids) ? draft.source_issue_ids : [])
        if (sourceIds.length === 0 || sourceIds.some((id) => !validIssueIds.has(id))) {
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
            description: composeLawDescription(draft),
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
        created_laws.push(law)
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

  private normalizeSuggestions(suggestions: any[], issues: any[]): LawDraftInput[] {
    if (!Array.isArray(suggestions)) return []
    return suggestions
      .map((suggestion, index) => {
        const title = String(suggestion?.title || suggestion?.name || '').trim()
        if (!title) return null
        const source_issue_ids = getSourceIssueIds(suggestion, issues, index)
        if (source_issue_ids.length === 0) return null
        const rule_content = String(suggestion?.rule_content || suggestion?.content || suggestion?.description || '').trim()
        const application = String(suggestion?.application || suggestion?.applicability || suggestion?.reason || '').trim()
        return {
          title,
          citation: String(suggestion?.citation || suggestion?.article || suggestion?.ref || '').trim(),
          rule_content,
          application,
          limitations: String(suggestion?.limitations || suggestion?.risk || suggestion?.risks || '').trim(),
          jurisdiction: String(suggestion?.jurisdiction || '中国大陆').trim(),
          source_reference: String(suggestion?.source_reference || suggestion?.source_url || suggestion?.source || '').trim(),
          confidence: clampConfidence(suggestion?.confidence),
          ai_reasoning: String(suggestion?.ai_reasoning || suggestion?.reasoning || suggestion?.reason || '').trim(),
          source_issue_ids,
        }
      })
      .filter(Boolean) as LawDraftInput[]
  }
}

export default LawDraftService
