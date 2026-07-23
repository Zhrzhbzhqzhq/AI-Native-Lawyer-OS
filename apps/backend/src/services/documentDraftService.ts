import type { PrismaClient } from '@lawdesk/database'
import {
  FORMAL_ARGUMENT_V2_HEADER,
  FORMAL_LAW_V2_HEADER,
} from './formalSemanticCodec'
import DocumentGenerationService, {
  buildDocumentReasoningScope,
  renderComplaintSections,
  sourceIdsFromScope,
} from './ai/DocumentGenerationService'
import { projectComplaintContext } from './documentProfessionalProjection'
import DocumentContextBuilder, {
  FORMAL_SOURCE_STATUSES,
  type DocumentContext,
} from './document_context_builder'
import CaseUnderstandingProductService from './context_engine/case_understanding_product_service'

export { buildDocumentContext } from './document_context_builder'
export type {
  DocumentCaseUnderstanding,
  DocumentArgumentScope,
  DocumentContext,
  DocumentContextEvidence,
  DocumentContextFact,
  DocumentContextIssue,
  DocumentContextLaw,
  DocumentContextSourceRows,
  DocumentMaterialSource,
  UnavailableDocumentMaterialSource,
} from './document_context_builder'

type DocumentDraftInput = {
  document_type: string
  title: string
  content: string
  confidence?: number | null
  ai_reasoning?: string
  source_argument_ids: string[]
  source_fact_ids: string[]
  source_issue_ids: string[]
  source_law_ids: string[]
}

export type DocumentDraftRow = {
  id: string
  matter_id: string
  document_type: string
  title: string
  content: string
  source_argument_ids: unknown
  source_fact_ids: unknown
  source_issue_ids: unknown
  source_law_ids: unknown
  confidence: number | null
  ai_reasoning: string | null
  review_status: string
  lawyer_note: string | null
  published_document_id: string | null
  published_at: Date | null
  created_at: Date
  updated_at: Date
}

const SUPPORTED_DOCUMENT_TYPES = ['complaint']
const FORMAL_DOCUMENT_STATUSES = new Set(['published', 'completed', 'final'])
const CLIENT_STATUSES = ['editing', 'ready_to_publish']

function uniqueStrings(values: unknown[]) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
}

function clampConfidence(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return null
  return Math.max(0, Math.min(1, number))
}

function serializeSourceIds(ids: string[]) {
  return JSON.stringify(uniqueStrings(ids))
}

function presentDraftRow<T extends Record<string, any>>(row: T): T {
  return {
    ...row,
    source_argument_ids: parseSourceIds(row.source_argument_ids),
    source_fact_ids: parseSourceIds(row.source_fact_ids),
    source_issue_ids: parseSourceIds(row.source_issue_ids),
    source_law_ids: parseSourceIds(row.source_law_ids),
  }
}

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const FORBIDDEN_CONTENT_PATTERNS = [
  /来源材料ID/i,
  /\bmat-[a-z0-9-]+\b/i,
  /AI判断/i,
  /可信度[:：]/i,
  /source_fact_ids/i,
  /source_issue_ids/i,
  /source_law_ids/i,
  /source_argument_ids/i,
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  /\.(md|txt|json|pdf|docx?)(?:\s|$|，|。|；|、)/i,
  new RegExp(FORMAL_ARGUMENT_V2_HEADER),
  new RegExp(FORMAL_LAW_V2_HEADER),
]

const ABSOLUTE_OUTCOME_PATTERNS = [
  /必然胜诉/,
  /一定胜诉/,
  /法院一定支持/,
  /法院必然支持/,
  /对方一定承担责任/,
  /对方必然承担责任/,
]

const COMPLAINT_ANALYSIS_HEADING_PATTERNS = [
  /^\s*(?:争议焦点|本方主张|论证|回应|阶段性结论)\s*[:：]/m,
  /^\s*(?:争议焦点及本方主张|案件基本事实|已确认事实|适用法律|法律推理|当前阶段性结论|现有来源|正式来源|已确认来源)\s*$/m,
  /^\s*(?:Issue|Position|Confirmed Facts|Applicable Laws|Legal Reasoning|Counter Argument|Response|Risk|Limitations|Conclusion|Internal Constraints|Scope)\s*:/mi,
]

export function assertComplaintContentSafe(content: string) {
  const text = String(content || '')
  const forbidden = [
    '来源材料：',
    '来源事实：',
    '来源争议焦点：',
    '来源法律依据：',
    '可能抗辩',
    '抗辩回应',
    '风险与薄弱点',
    '本案论证意见',
    '证明目标',
    '摘要：',
    'LawDesk',
  ]
  const matchedKeyword = forbidden.find((keyword) => text.includes(keyword))
  if (
    matchedKeyword
    || FORBIDDEN_CONTENT_PATTERNS.some((pattern) => pattern.test(text))
    || ABSOLUTE_OUTCOME_PATTERNS.some((pattern) => pattern.test(text))
    || COMPLAINT_ANALYSIS_HEADING_PATTERNS.some((pattern) => pattern.test(text))
  ) {
    const error = new Error('unsafe_document_content')
    ;(error as any).code = 'unsafe_document_content'
    throw error
  }
  const closingIndex = text.indexOf('\n此致')
  if (closingIndex >= 0) {
    const closing = text.slice(closingIndex)
    const validClosing = /^\n此致\n[^\n]+\n\n具状人：\n[^\n]+\n\n日期：\n[^\n]+\s*$/.test(closing)
    if (!validClosing || /(?:结语|结论|阶段性结论)\s*[:：]/.test(closing)) {
      const error = new Error('unsafe_document_content')
      ;(error as any).code = 'unsafe_document_content'
      throw error
    }
  }
}

export function composeNeutralComplaint(context: DocumentContext): DocumentDraftInput {
  const content = projectComplaintContext(context)

  assertComplaintContentSafe(content)
  return {
    title: `${context.matter.title || '案件'}民事起诉状`,
    document_type: 'complaint',
    content,
    confidence: context.argument_scopes.length > 0 ? 0.8 : 0,
    ai_reasoning: '基于当前 Matter 中关系闭环完整的正式 Evidence、Fact、Issue、Law 和 Argument 组织中性民事起诉状草稿；未由正式来源提供的信息均保留律师补充标记。',
    source_argument_ids: uniqueStrings(context.arguments.map((argument) => argument.argument_id)),
    source_fact_ids: uniqueStrings(context.facts.map((fact) => fact.fact_id)),
    source_issue_ids: uniqueStrings(context.issues.map((issue) => issue.issue_id)),
    source_law_ids: uniqueStrings(context.laws.map((law) => law.law_id)),
  }
}

function parseSourceIds(value: unknown): string[] {
  if (Array.isArray(value)) return uniqueStrings(value)
  if (typeof value !== 'string') return []

  const text = value.trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return uniqueStrings(parsed)
    if (typeof parsed === 'string') return uniqueStrings([parsed])
  } catch {
    return uniqueStrings([text])
  }
  return []
}

export class DocumentDraftService {
  private readonly documentContextBuilder: DocumentContextBuilder

  constructor(
    private prisma: PrismaClient,
    private documentGenerationService = new DocumentGenerationService(),
    documentContextBuilder?: DocumentContextBuilder,
  ) {
    this.documentContextBuilder = documentContextBuilder
      || new DocumentContextBuilder(new CaseUnderstandingProductService(prisma))
  }

  async listDrafts(matter_id: string): Promise<DocumentDraftRow[]> {
    const rows = await (this.prisma as any).documentDraft.findMany({
      where: { matter_id },
      orderBy: { created_at: 'asc' },
    })
    return rows.map((row: any) => presentDraftRow(row))
  }

  async getDraft(matter_id: string, draft_id: string): Promise<DocumentDraftRow | null> {
    const draft = await (this.prisma as any).documentDraft.findUnique({ where: { id: draft_id } })
    if (!draft) return null
    if (String(draft.matter_id) !== String(matter_id)) {
      const error = new Error('draft_matter_mismatch')
      ;(error as any).code = 'draft_matter_mismatch'
      throw error
    }
    return presentDraftRow(draft)
  }

  async generateDraft(matter_id: string, document_type = 'complaint'): Promise<{ status: 'document_draft_ready'; idempotent: boolean; document_draft: DocumentDraftRow }> {
    const type = String(document_type || '').trim() || 'complaint'
    if (!SUPPORTED_DOCUMENT_TYPES.includes(type)) {
      const error = new Error('unsupported_document_type')
      ;(error as any).code = 'unsupported_document_type'
      throw error
    }

    const existing = await (this.prisma as any).documentDraft.findFirst({
      where: { matter_id, document_type: type, published_at: null },
      orderBy: { created_at: 'asc' },
    })
    if (existing) return { status: 'document_draft_ready', idempotent: true, document_draft: presentDraftRow(existing) }

    const context = await this.readFormalSources(matter_id, type, '')
    const draft = await this.composeDraft(context)

    const created = await (this.prisma as any).documentDraft.create({
      data: {
        matter_id,
        document_type: draft.document_type,
        title: draft.title,
        content: draft.content,
        source_argument_ids: serializeSourceIds(draft.source_argument_ids),
        source_fact_ids: serializeSourceIds(draft.source_fact_ids),
        source_issue_ids: serializeSourceIds(draft.source_issue_ids),
        source_law_ids: serializeSourceIds(draft.source_law_ids),
        confidence: draft.confidence,
        ai_reasoning: draft.ai_reasoning,
        review_status: 'generated',
      },
    })

    return { status: 'document_draft_ready', idempotent: false, document_draft: presentDraftRow(created) }
  }

  async updateDraft(matter_id: string, draft_id: string, payload: { title?: string; content?: string; lawyer_note?: string; review_status?: string }): Promise<DocumentDraftRow> {
    const draft = await this.getRequiredDraft(matter_id, draft_id)
    if (draft.published_at || draft.published_document_id) {
      const error = new Error('draft_already_published')
      ;(error as any).code = 'draft_already_published'
      throw error
    }

    const patch: any = {}
    let contentChanged = false
    if (typeof payload.title === 'string') {
      const title = payload.title.trim()
      if (!title) {
        const error = new Error('title_required')
        ;(error as any).code = 'title_required'
        throw error
      }
      patch.title = title
    }
    if (typeof payload.content === 'string') {
      assertComplaintContentSafe(payload.content)
      patch.content = payload.content
      contentChanged = true
    }
    if (typeof payload.lawyer_note === 'string') patch.lawyer_note = payload.lawyer_note
    if (contentChanged) {
      patch.review_status = 'editing'
    } else if (typeof payload.review_status === 'string') {
      if (!CLIENT_STATUSES.includes(payload.review_status)) {
        const error = new Error('invalid_review_status')
        ;(error as any).code = 'invalid_review_status'
        throw error
      }
      if (payload.review_status === 'ready_to_publish') assertComplaintContentSafe(String(draft.content || ''))
      patch.review_status = payload.review_status
    }
    if (Object.keys(patch).length === 0) {
      const error = new Error('nothing_to_update')
      ;(error as any).code = 'nothing_to_update'
      throw error
    }

    const updated = await (this.prisma as any).documentDraft.update({ where: { id: draft.id }, data: patch })
    return presentDraftRow(updated)
  }

  async regenerateDraft(matter_id: string, draft_id: string, payload: { lawyer_note?: string }): Promise<DocumentDraftRow> {
    const draft = await this.getRequiredDraft(matter_id, draft_id)
    if (draft.published_at || draft.published_document_id) {
      const error = new Error('draft_already_published')
      ;(error as any).code = 'draft_already_published'
      throw error
    }
    const lawyerInstruction = typeof payload.lawyer_note === 'string' ? payload.lawyer_note : String(draft.lawyer_note || '')
    const context = await this.readFormalSources(matter_id, draft.document_type, lawyerInstruction)
    const next = await this.composeDraft(context)

    const updated = await (this.prisma as any).documentDraft.update({
      where: { id: draft.id },
      data: {
        title: next.title,
        content: next.content,
        confidence: next.confidence,
        ai_reasoning: next.ai_reasoning,
        source_argument_ids: serializeSourceIds(next.source_argument_ids),
        source_fact_ids: serializeSourceIds(next.source_fact_ids),
        source_issue_ids: serializeSourceIds(next.source_issue_ids),
        source_law_ids: serializeSourceIds(next.source_law_ids),
        lawyer_note: typeof payload.lawyer_note === 'string' ? payload.lawyer_note : draft.lawyer_note,
        review_status: 'editing',
      },
    })
    return presentDraftRow(updated)
  }

  async publishDraft(matter_id: string, draft_id: string) {
    return (this.prisma as any).$transaction((tx: any) => this.publishDraftInTransaction(tx, matter_id, draft_id))
  }

  async publishDrafts(matter_id: string, draft_ids: string[]) {
    return (this.prisma as any).$transaction(async (tx: any) => {
      const results = []
      for (const draft_id of draft_ids) {
        results.push(await this.publishDraftInTransaction(tx, matter_id, draft_id))
      }
      return results
    })
  }

  private async publishDraftInTransaction(tx: any, matter_id: string, draft_id: string) {
    const draft = await tx.documentDraft.findUnique({ where: { id: draft_id } })
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
      if (draft.published_document_id) {
        const existing = await tx.document.findUnique({ where: { document_id: draft.published_document_id } })
        if (!existing) {
          const error = new Error('published_document_not_found')
          ;(error as any).code = 'published_document_not_found'
          throw error
        }
        if (String(existing.matter_id) !== String(matter_id)) {
          const error = new Error('published_document_matter_mismatch')
          ;(error as any).code = 'published_document_matter_mismatch'
          throw error
        }
        if (!FORMAL_DOCUMENT_STATUSES.has(String(existing.status || ''))) {
          const error = new Error('published_document_invalid_status')
          ;(error as any).code = 'published_document_invalid_status'
          throw error
        }
        return await this.buildPublishResult(tx, matter_id, draft, existing, true)
      }
      if (String(draft.review_status || '') !== 'ready_to_publish') {
        const error = new Error('document_draft_not_ready')
        ;(error as any).code = 'document_draft_not_ready'
        throw error
      }
      if (String(draft.content || '').trim().length === 0) {
        const error = new Error('content_required')
        ;(error as any).code = 'content_required'
        throw error
      }
      assertComplaintContentSafe(String(draft.content || ''))

      const sources = await this.validateSources(tx, matter_id, {
        source_argument_ids: parseSourceIds(draft.source_argument_ids),
        source_fact_ids: parseSourceIds(draft.source_fact_ids),
        source_issue_ids: parseSourceIds(draft.source_issue_ids),
        source_law_ids: parseSourceIds(draft.source_law_ids),
      })

      const document_id = `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      const document = await tx.document.create({
        data: {
          document_id,
          matter_id,
          argument_id: sources.argumentIds[0] || null,
          title: draft.title,
          document_type: draft.document_type,
          content_uri: '',
          content: draft.content,
          status: 'published',
          version: 'v1',
        },
      })

      const counts = await this.createSourceLinks(tx, document.document_id, sources)
      await tx.documentDraft.update({
        where: { id: draft.id },
        data: {
          review_status: 'published',
          published_document_id: document.document_id,
          published_at: new Date(),
        },
      })

      return {
        status: 'document_published',
        matter_id,
        document,
        idempotent: false,
        ...counts,
      }
  }

  private async getRequiredDraft(matter_id: string, draft_id: string): Promise<DocumentDraftRow> {
    const draft = await this.getDraft(matter_id, draft_id)
    if (!draft) {
      const error = new Error('draft_not_found')
      ;(error as any).code = 'draft_not_found'
      throw error
    }
    return draft
  }

  private async readFormalSources(matter_id: string, document_type: string, lawyer_instruction: string): Promise<DocumentContext> {
    const [matter, evidences, facts, issues, laws, argumentsList] = await Promise.all([
      this.prisma.matter.findUnique({ where: { matter_id } }),
      this.prisma.evidence.findMany({ where: { matter_id, status: { in: FORMAL_SOURCE_STATUSES } }, include: { material: true }, orderBy: { created_at: 'asc' } }),
      this.prisma.fact.findMany({ where: { matter_id, status: { in: FORMAL_SOURCE_STATUSES } }, orderBy: { created_at: 'asc' } }),
      this.prisma.issue.findMany({ where: { matter_id, status: { in: FORMAL_SOURCE_STATUSES } }, orderBy: { created_at: 'asc' } }),
      this.prisma.law.findMany({ where: { matter_id, status: { in: FORMAL_SOURCE_STATUSES } }, orderBy: { created_at: 'asc' } }),
      this.prisma.argument.findMany({ where: { matter_id, status: { in: FORMAL_SOURCE_STATUSES } }, orderBy: { created_at: 'asc' } }),
    ])
    if (!matter) {
      const error = new Error('matter_not_found')
      ;(error as any).code = 'matter_not_found'
      throw error
    }
    if (argumentsList.length === 0) {
      const error = new Error('formal_arguments_required')
      ;(error as any).code = 'formal_arguments_required'
      throw error
    }
    const [factEvidenceLinks, issueFactLinks, lawIssueLinks, argumentFactLinks, argumentIssueLinks, argumentLawLinks] = await Promise.all([
      (this.prisma as any).factEvidence.findMany({ where: { fact: { matter_id }, evidence: { matter_id } } }),
      (this.prisma as any).issueFact.findMany({ where: { issue: { matter_id }, fact: { matter_id } } }),
      (this.prisma as any).lawIssue.findMany({ where: { law: { matter_id }, issue: { matter_id } } }),
      (this.prisma as any).argumentFact.findMany({ where: { argument: { matter_id }, fact: { matter_id } } }),
      (this.prisma as any).argumentIssue.findMany({ where: { argument: { matter_id }, issue: { matter_id } } }),
      (this.prisma as any).argumentLaw.findMany({ where: { argument: { matter_id }, law: { matter_id } } }),
    ])
    const context = await this.documentContextBuilder.build({
      matter_id,
      document_type,
      lawyer_instruction,
      matter,
      evidences,
      facts,
      issues,
      laws,
      argumentsList,
      factEvidenceLinks,
      issueFactLinks,
      lawIssueLinks,
      argumentFactLinks,
      argumentIssueLinks,
      argumentLawLinks,
    })
    if (context.argument_scopes.length === 0) {
      const error = new Error('document_context_no_valid_argument_scopes')
      ;(error as any).code = 'document_context_no_valid_argument_scopes'
      ;(error as any).diagnostics = context.excluded_scopes
      throw error
    }
    return context
  }

  private async composeDraft(context: DocumentContext): Promise<DocumentDraftInput> {
    const scope = buildDocumentReasoningScope(context)
    const generated = await this.documentGenerationService.generate(context.matter.matter_id, scope)
    if (!generated.ok) {
      const fallback = composeNeutralComplaint(context)
      return {
        ...fallback,
        ai_reasoning: `deterministic_fallback:${generated.reason}`,
      }
    }

    const content = renderComplaintSections(generated.sections)
    assertComplaintContentSafe(content)
    const sourceIds = sourceIdsFromScope(scope)
    return {
      title: generated.sections.title,
      document_type: 'complaint',
      content,
      confidence: generated.mode === 'ai_generated' ? 0.85 : 0.75,
      ai_reasoning: generated.mode,
      source_argument_ids: sourceIds.argumentIds,
      source_fact_ids: sourceIds.factIds,
      source_issue_ids: sourceIds.issueIds,
      source_law_ids: sourceIds.lawIds,
    }
  }

  private async validateSources(tx: any, matter_id: string, sources: { source_argument_ids: string[]; source_fact_ids: string[]; source_issue_ids: string[]; source_law_ids: string[] }) {
    const [facts, issues, laws, args] = await Promise.all([
      tx.fact.findMany({ where: { matter_id, status: { in: FORMAL_SOURCE_STATUSES } } }),
      tx.issue.findMany({ where: { matter_id, status: { in: FORMAL_SOURCE_STATUSES } } }),
      tx.law.findMany({ where: { matter_id, status: { in: FORMAL_SOURCE_STATUSES } } }),
      tx.argument.findMany({ where: { matter_id, status: { in: FORMAL_SOURCE_STATUSES } } }),
    ])
    const validFactIds = new Set(facts.map((fact: any) => String(fact.fact_id)))
    const validIssueIds = new Set(issues.map((issue: any) => String(issue.issue_id)))
    const validLawIds = new Set(laws.map((law: any) => String(law.law_id)))
    const validArgumentIds = new Set(args.map((argument: any) => String(argument.argument_id)))

    const argumentIds = uniqueStrings(sources.source_argument_ids)
    const factIds = uniqueStrings(sources.source_fact_ids)
    const issueIds = uniqueStrings(sources.source_issue_ids)
    const lawIds = uniqueStrings(sources.source_law_ids)

    if (argumentIds.length === 0 || argumentIds.some((id) => !validArgumentIds.has(id))) {
      const error = new Error('invalid_source_argument_ids')
      ;(error as any).code = 'invalid_source_argument_ids'
      throw error
    }
    if (factIds.some((id) => !validFactIds.has(id))) {
      const error = new Error('invalid_source_fact_ids')
      ;(error as any).code = 'invalid_source_fact_ids'
      throw error
    }
    if (issueIds.some((id) => !validIssueIds.has(id))) {
      const error = new Error('invalid_source_issue_ids')
      ;(error as any).code = 'invalid_source_issue_ids'
      throw error
    }
    if (lawIds.some((id) => !validLawIds.has(id))) {
      const error = new Error('invalid_source_law_ids')
      ;(error as any).code = 'invalid_source_law_ids'
      throw error
    }
    return { argumentIds, factIds, issueIds, lawIds }
  }

  private async createSourceLinks(tx: any, document_id: string, sources: { argumentIds: string[]; factIds: string[]; issueIds: string[]; lawIds: string[] }) {
    let document_argument_links = 0
    let document_fact_links = 0
    let document_issue_links = 0
    let document_law_links = 0
    for (const argument_id of sources.argumentIds) {
      await tx.documentArgument.create({ data: { document_id, argument_id } })
      document_argument_links += 1
    }
    for (const fact_id of sources.factIds) {
      await tx.documentFact.create({ data: { document_id, fact_id } })
      document_fact_links += 1
    }
    for (const issue_id of sources.issueIds) {
      await tx.documentIssue.create({ data: { document_id, issue_id } })
      document_issue_links += 1
    }
    for (const law_id of sources.lawIds) {
      await tx.documentLaw.create({ data: { document_id, law_id } })
      document_law_links += 1
    }
    return { document_argument_links, document_fact_links, document_issue_links, document_law_links }
  }

  private async buildPublishResult(tx: any, matter_id: string, draft: any, document: any, idempotent: boolean) {
    const [argumentLinks, factLinks, issueLinks, lawLinks] = await Promise.all([
      tx.documentArgument.count({ where: { document_id: document.document_id } }),
      tx.documentFact.count({ where: { document_id: document.document_id } }),
      tx.documentIssue.count({ where: { document_id: document.document_id } }),
      tx.documentLaw.count({ where: { document_id: document.document_id } }),
    ])
    if (String(draft.review_status) !== 'published' || !draft.published_at) {
      await tx.documentDraft.update({
        where: { id: draft.id },
        data: { review_status: 'published', published_document_id: document.document_id, published_at: new Date() },
      })
    }
    return {
      status: 'document_published',
      matter_id,
      document,
      idempotent,
      document_argument_links: Number(argumentLinks),
      document_fact_links: Number(factLinks),
      document_issue_links: Number(issueLinks),
      document_law_links: Number(lawLinks),
    }
  }
}

export function buildSimpleDocx(title: string, content: string): Buffer {
  const lines = String(content || '').split(/\r?\n/)
  const body = [
    `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(title)}</w:t></w:r></w:p>`,
    ...lines.map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`),
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>',
  ].join('')
  const files = [
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    },
    {
      name: 'word/document.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
    },
  ]
  return makeZip(files.map((file) => ({ name: file.name, data: Buffer.from(file.content, 'utf8') })))
}

function makeCrcTable() {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let j = 0; j < 8; j += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
}

const CRC_TABLE = makeCrcTable()

function crc32(buffer: Buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function makeZip(files: Array<{ name: string; data: Buffer }>) {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const data = file.data
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    locals.push(local, name, data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, name)
    offset += local.length + name.length + data.length
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)
  return Buffer.concat([...locals, ...centrals, end])
}

export default DocumentDraftService
