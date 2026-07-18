import type { PrismaClient } from '@lawdesk/database'

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

function pending(label: string) {
  return `【待律师补充：${label}】`
}

function pendingConfirm(label: string) {
  return `【待律师确认：${label}】`
}

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function extractParties(matter: any, facts: any[]) {
  const title = String(matter?.title || '')
  const titleMatch = title.match(/^(.+?)(?:诉|与|起诉)(.+?)(?:民间借贷|借贷|合同|纠纷|$)/)
  const plaintiffFromTitle = titleMatch?.[1]?.trim()
  const defendantFromTitle = titleMatch?.[2]?.trim()

  const text = facts.map((fact) => `${fact.title || ''}\n${fact.description || ''}`).join('\n')
  const plaintiffPatterns = [/原告[：:\s]*([^\s，,。；;]+)/, /出借人[：:\s]*([^\s，,。；;]+)/, /委托人[：:\s]*([^\s，,。；;]+)/]
  const defendantPatterns = [/被告[：:\s]*([^\s，,。；;]+)/, /借款人[：:\s]*([^\s，,。；;]+)/, /对方当事人[：:\s]*([^\s，,。；;]+)/]
  const find = (patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const matched = text.match(pattern)
      if (matched?.[1]) return matched[1].trim()
    }
    return ''
  }

  return {
    plaintiff: plaintiffFromTitle || find(plaintiffPatterns) || pending('原告姓名'),
    defendant: defendantFromTitle || find(defendantPatterns) || pending('被告姓名'),
  }
}

function extractAmount(rows: any[]) {
  const text = rows.map((row) => `${row.title || ''}\n${row.description || ''}\n${row.conclusion || ''}\n${row.citation || ''}\n${row.content || ''}`).join('\n')
  const match = text.match(/(?:人民币|借款|本金|金额|转账|支付)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:元|万元)/)
  if (!match) return pending('借款本金金额')
  const suffix = match[0].includes('万元') ? '万元' : '元'
  return `${match[1].replace(/,/g, '')}${suffix}`
}

function hasChineseDate(text: string) {
  return /\d{4}年\d{1,2}月\d{1,2}日/.test(text) || /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(text)
}

function sanitizeLegalSentence(value: unknown) {
  return String(value || '')
    .replace(/来源材料ID[:：][^\n。；;]*/g, '')
    .replace(/来源材料[:：][^\n。；;]*/g, '')
    .replace(/来源事实[:：][^\n。；;]*/g, '')
    .replace(/来源争议焦点[:：][^\n。；;]*/g, '')
    .replace(/来源法律依据[:：][^\n。；;]*/g, '')
    .replace(/AI判断理由?[:：]?/g, '')
    .replace(/证明目标[:：]?/g, '')
    .replace(/摘要[:：]?/g, '')
    .replace(/可信度[:：]?\s*\d+(?:\.\d+)?%?/g, '')
    .replace(/\b(?:mat|ev|fd|doc|arg|law|issue|fact)-[a-z0-9-]+\b/gi, '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    .replace(/[\w\u4e00-\u9fa5_ -]+\.(?:md|txt|json|pdf|docx?)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword))
}

function sourceText(rows: any[]) {
  return rows.map((row) => sanitizeLegalSentence([
    row.title,
    row.description,
    row.conclusion,
    row.content,
    row.citation,
    row.rule_content,
    row.application,
  ].filter(Boolean).join('。'))).join('。')
}

function hasConcept(text: string, keywords: string[]) {
  return includesAny(text, keywords)
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
  if (matchedKeyword || FORBIDDEN_CONTENT_PATTERNS.some((pattern) => pattern.test(text))) {
    const error = new Error('unsafe_document_content')
    ;(error as any).code = 'unsafe_document_content'
    throw error
  }
}

function buildComplaintDraft(input: {
  matter: any
  facts: any[]
  issues: any[]
  laws: any[]
  argumentsList: any[]
  lawyerNote?: string
}) {
  const { matter, facts, issues, laws, argumentsList, lawyerNote } = input
  const { plaintiff, defendant } = extractParties(matter, facts)
  const amount = extractAmount([...facts, ...argumentsList])
  const allText = sourceText([...facts, ...issues, ...laws, ...argumentsList])
  const loanDate = hasChineseDate(allText) ? '双方形成借贷关系后，原告按约履行出借义务。' : `双方于${pending('借款日期')}前后形成借贷关系，具体借款时间由律师根据证据进一步核对。`
  const dueDate = hasConcept(allText, ['到期', '期限', '还款']) ? '借款期限届满后，被告未按约履行还款义务。' : `双方约定或依法应确定的还款期限为${pending('到期日期')}，该日期由律师结合借条、聊天记录及其他证据最终确认。`
  const agreementSentence = hasConcept(allText, ['借款', '借条', '出借', '借款合意', '民间借贷'])
    ? `原告${plaintiff}与被告${defendant}之间存在民间借贷关系，双方就借款事项形成合意。`
    : `原告与被告之间的借贷合意及具体约定仍需律师结合材料进一步确认。`
  const deliverySentence = hasConcept(allText, ['银行流水', '转账', '支付', '交付', '汇款', '到账'])
    ? '原告已经按照约定向被告交付借款，相关资金交付事实有转账、流水或其他款项交付材料相互印证。'
    : `原告是否已经完成全部款项交付及交付方式仍需律师补充核对，借款本金暂列为${amount}。`
  const demandSentence = hasConcept(allText, ['催收', '律师函', '电话', '未还', '未归还', '逾期'])
    ? '借款到期后，原告曾通过沟通、催告或律师函等方式要求被告履行还款义务，但被告至今未清偿。'
    : '借款到期后的催告经过及被告未清偿事实，仍需律师结合证据进一步完善。'
  const lawSentence = laws.length > 0 || hasConcept(allText, ['民法典', '借款合同', '还款义务', '违约'])
    ? '根据民事法律关于借款合同、债务履行和违约责任的规定，被告在取得借款后应当按照约定返还本金并承担相应资金占用损失或逾期责任。'
    : '被告未按约返还借款的法律责任，需律师结合适用法律进一步确认。'
  const necessitySentence = argumentsList.length > 0
    ? '现被告仍未履行还款义务，原告为维护自身合法权益，依法向人民法院提起诉讼。'
    : '因双方纠纷未能通过协商解决，原告依法向人民法院提起诉讼。'

  const content = [
    '民事起诉状',
    '',
    '原告基本信息',
    `原告：${plaintiff}，${pending('原告身份证号码及住所')}，联系方式：${pending('原告联系方式')}。`,
    '',
    '被告基本信息',
    `被告：${defendant}，${pending('被告身份证号码及住所')}，联系方式：${pending('被告联系方式')}。`,
    '',
    '诉讼请求：',
    `1. 请求人民法院依法判令被告向原告偿还借款本金 ${amount}；`,
    `2. 请求人民法院依法判令被告向原告支付逾期利息或资金占用损失，具体以${pendingConfirm('利息起算日、利率及暂计金额')}为准；`,
    '3. 请求人民法院依法判令被告承担本案诉讼费、保全费及其他依法应由其承担的费用。',
    '',
    '事实与理由：',
    agreementSentence,
    loanDate,
    deliverySentence,
    dueDate,
    demandSentence,
    lawSentence,
    necessitySentence,
    '',
    lawyerNote ? `律师补充意见：${sanitizeLegalSentence(lawyerNote)}` : '',
    '',
    '证据和证据来源：',
    '1. 借条，用于证明双方借贷合意及借款金额；',
    '2. 银行流水，用于证明原告已实际交付借款；',
    '3. 微信聊天记录，用于证明借贷关系及催收经过；',
    '4. 电话录音整理，用于证明被告确认债务及未还款事实；',
    '5. 律师函及送达材料，用于证明原告已进行催告。',
    '具体证据名称、页码、原件或复印件状态及证明目的由律师最终核对。',
    '',
    '此致',
    pendingConfirm('管辖法院'),
    '',
    `具状人：${plaintiff}`,
    `日期：${pending('提交日期')}`,
  ].filter((line) => line !== '').join('\n')

  assertComplaintContentSafe(content)

  return {
    title: `${matter?.title || '案件'}民事起诉状`,
    document_type: 'complaint',
    content,
    confidence: argumentsList.length > 0 && facts.length > 0 && issues.length > 0 && laws.length > 0 ? 0.86 : 0.66,
    ai_reasoning: '基于当前 Matter 中已发布的事实、争议焦点、法律依据和论证意见整理民事起诉状草稿；缺失的法院、身份信息、利息计算与提交日期均保留律师补充占位。',
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
  constructor(private prisma: PrismaClient) {}

  async listDrafts(matter_id: string): Promise<DocumentDraftRow[]> {
    return (this.prisma as any).documentDraft.findMany({
      where: { matter_id },
      orderBy: { created_at: 'asc' },
    })
  }

  async getDraft(matter_id: string, draft_id: string): Promise<DocumentDraftRow | null> {
    const draft = await (this.prisma as any).documentDraft.findUnique({ where: { id: draft_id } })
    if (!draft) return null
    if (String(draft.matter_id) !== String(matter_id)) {
      const error = new Error('draft_matter_mismatch')
      ;(error as any).code = 'draft_matter_mismatch'
      throw error
    }
    return draft
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
    if (existing) return { status: 'document_draft_ready', idempotent: true, document_draft: existing }

    const data = await this.readFormalSources(matter_id)
    if (data.argumentsList.length === 0) {
      const error = new Error('formal_arguments_required')
      ;(error as any).code = 'formal_arguments_required'
      throw error
    }

    const draft = this.composeDraft({
      matter_id,
      document_type: type,
      ...data,
    })

    const created = await (this.prisma as any).documentDraft.create({
      data: {
        matter_id,
        document_type: draft.document_type,
        title: draft.title,
        content: draft.content,
        source_argument_ids: JSON.stringify(draft.source_argument_ids),
        source_fact_ids: JSON.stringify(draft.source_fact_ids),
        source_issue_ids: JSON.stringify(draft.source_issue_ids),
        source_law_ids: JSON.stringify(draft.source_law_ids),
        confidence: draft.confidence,
        ai_reasoning: draft.ai_reasoning,
        review_status: 'generated',
      },
    })

    return { status: 'document_draft_ready', idempotent: false, document_draft: created }
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
      patch.review_status = payload.review_status
    }
    if (Object.keys(patch).length === 0) {
      const error = new Error('nothing_to_update')
      ;(error as any).code = 'nothing_to_update'
      throw error
    }

    return (this.prisma as any).documentDraft.update({ where: { id: draft.id }, data: patch })
  }

  async regenerateDraft(matter_id: string, draft_id: string, payload: { lawyer_note?: string }): Promise<DocumentDraftRow> {
    const draft = await this.getRequiredDraft(matter_id, draft_id)
    if (draft.published_at || draft.published_document_id) {
      const error = new Error('draft_already_published')
      ;(error as any).code = 'draft_already_published'
      throw error
    }
    const data = await this.readFormalSources(matter_id)
    const next = this.composeDraft({
      matter_id,
      document_type: draft.document_type,
      ...data,
      lawyerNote: typeof payload.lawyer_note === 'string' ? payload.lawyer_note : String(draft.lawyer_note || ''),
    })

    return (this.prisma as any).documentDraft.update({
      where: { id: draft.id },
      data: {
        title: next.title,
        content: next.content,
        confidence: next.confidence,
        ai_reasoning: next.ai_reasoning,
        source_argument_ids: next.source_argument_ids,
        source_fact_ids: next.source_fact_ids,
        source_issue_ids: next.source_issue_ids,
        source_law_ids: next.source_law_ids,
        lawyer_note: typeof payload.lawyer_note === 'string' ? payload.lawyer_note : draft.lawyer_note,
        review_status: 'editing',
      },
    })
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

  private async readFormalSources(matter_id: string) {
    const [matter, facts, issues, laws, argumentsList] = await Promise.all([
      this.prisma.matter.findUnique({ where: { matter_id } }),
      this.prisma.fact.findMany({ where: { matter_id, status: { not: 'rejected' } }, orderBy: { created_at: 'asc' } }),
      this.prisma.issue.findMany({ where: { matter_id, status: { not: 'rejected' } }, orderBy: { created_at: 'asc' } }),
      this.prisma.law.findMany({ where: { matter_id, status: { not: 'rejected' } }, orderBy: { created_at: 'asc' } }),
      this.prisma.argument.findMany({ where: { matter_id, status: { not: 'rejected' } }, orderBy: { created_at: 'asc' } }),
    ])
    if (!matter) {
      const error = new Error('matter_not_found')
      ;(error as any).code = 'matter_not_found'
      throw error
    }
    return { matter, facts, issues, laws, argumentsList }
  }

  private composeDraft(input: {
    matter_id: string
    document_type: string
    matter: any
    facts: any[]
    issues: any[]
    laws: any[]
    argumentsList: any[]
    lawyerNote?: string
  }): DocumentDraftInput {
    const complaint = buildComplaintDraft(input)
    return {
      document_type: complaint.document_type,
      title: complaint.title,
      content: complaint.content,
      confidence: complaint.confidence,
      ai_reasoning: complaint.ai_reasoning,
      source_argument_ids: uniqueStrings(input.argumentsList.map((argument) => argument.argument_id)),
      source_fact_ids: uniqueStrings(input.facts.map((fact) => fact.fact_id)),
      source_issue_ids: uniqueStrings(input.issues.map((issue) => issue.issue_id)),
      source_law_ids: uniqueStrings(input.laws.map((law) => law.law_id)),
    }
  }

  private async validateSources(tx: any, matter_id: string, sources: { source_argument_ids: string[]; source_fact_ids: string[]; source_issue_ids: string[]; source_law_ids: string[] }) {
    const [facts, issues, laws, args] = await Promise.all([
      tx.fact.findMany({ where: { matter_id, status: { not: 'rejected' } } }),
      tx.issue.findMany({ where: { matter_id, status: { not: 'rejected' } } }),
      tx.law.findMany({ where: { matter_id, status: { not: 'rejected' } } }),
      tx.argument.findMany({ where: { matter_id, status: { not: 'rejected' } } }),
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
