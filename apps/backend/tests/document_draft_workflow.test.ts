import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import buildApp from '../src/server'
import { createPrismaClient } from '@lawdesk/database'
import DocumentDraftService from '../src/services/documentDraftService'

let app: any
let prisma: any
let documentDraftService: DocumentDraftService
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const MATTER_ID = `test-doc-draft-${RUN_ID}`
const OTHER_MATTER_ID = `test-doc-draft-other-${RUN_ID}`

const forbiddenDocumentText = [
  '来源材料ID',
  'mat-',
  'AI判断',
  '可信度：',
  'confidence',
  '.md',
  '来源事实：',
  '来源争议焦点：',
  '来源法律依据：',
  '可能抗辩',
  '抗辩回应',
  '风险与薄弱点',
  '本案论证意见',
  'source_fact_ids',
  'source_issue_ids',
  'source_law_ids',
  'source_argument_ids',
]

function expectSubmissionReadyComplaint(content: string) {
  expect(content).toContain('民事起诉状')
  expect(content).toContain('原告：')
  expect(content).toContain('被告：')
  expect(content).toContain('诉讼请求')
  expect(content).toContain('事实与理由')
  expect(content).toContain('证据和证据来源')
  expect(content).toContain('此致')
  expect(content).toContain('【待律师根据已确认 Argument 和案件目标补充】')
  expect(content).toContain('【待律师补充：受理法院】')
  for (const forbidden of forbiddenDocumentText) {
    expect(content).not.toContain(forbidden)
  }
}

async function seedMatter(matterId: string, withArguments = true) {
  await prisma.matter.create({
    data: { matter_id: matterId, title: '张建国诉李海涛民间借贷纠纷', description: '测试', matter_type: '民间借贷纠纷', status: 'active' },
  })
  const fact = await prisma.fact.create({
    data: { fact_id: `${matterId}-fact-1`, matter_id: matterId, title: '借款已经实际交付', description: '银行流水与借条相互印证。', status: 'active' },
  })
  const material = await prisma.material.create({
    data: { material_id: `${matterId}-material-1`, matter_id: matterId, title: '客户提交的合同材料', material_type: 'text', source: 'client', storage_uri: '', status: 'active' },
  })
  const evidence = await prisma.evidence.create({
    data: { evidence_id: `${matterId}-evidence-1`, matter_id: matterId, material_id: material.material_id, title: '合同材料证据', evidence_type: 'document', description: '记录双方约定。', relevance: '支持合同事实', status: 'active' },
  })
  await prisma.factEvidence.create({ data: { fact_id: fact.fact_id, evidence_id: evidence.evidence_id, note: 'document-context-source' } })
  const issue = await prisma.issue.create({
    data: { issue_id: `${matterId}-issue-1`, matter_id: matterId, title: '出借人是否完成借款交付义务', description: '影响本金请求。', status: 'active' },
  })
  const law = await prisma.law.create({
    data: { law_id: `${matterId}-law-1`, matter_id: matterId, issue_id: issue.issue_id, title: '民间借贷合同规则', citation: '民法典第六百六十七条', description: '借款合同规则。', status: 'active' },
  })
  await prisma.issueFact.create({ data: { issue_id: issue.issue_id, fact_id: fact.fact_id } })
  await prisma.lawIssue.create({ data: { law_id: law.law_id, issue_id: issue.issue_id } })
  let argument: any = null
  if (withArguments) {
    argument = await prisma.argument.create({
      data: { argument_id: `${matterId}-arg-1`, matter_id: matterId, issue_id: issue.issue_id, title: '被告应偿还借款本金', description: '借款合意和资金交付均可证明。', conclusion: '请求支持还款。', status: 'active' },
    })
    await prisma.argumentFact.create({ data: { argument_id: argument.argument_id, fact_id: fact.fact_id } })
    await prisma.argumentIssue.create({ data: { argument_id: argument.argument_id, issue_id: issue.issue_id } })
    await prisma.argumentLaw.create({ data: { argument_id: argument.argument_id, law_id: law.law_id } })
  }
  return { fact, issue, law, argument }
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must explicitly target the isolated RC test database')
  if (new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '') !== 'lawdesk_rc_test') throw new Error('Draft workflow tests require DATABASE_URL to target lawdesk_rc_test')
  prisma = createPrismaClient()
  documentDraftService = new DocumentDraftService(prisma)
  app = await buildApp()
  await prisma.documentLaw.deleteMany({ where: { document: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.documentIssue.deleteMany({ where: { document: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.documentFact.deleteMany({ where: { document: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.documentArgument.deleteMany({ where: { document: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await (prisma as any).documentDraft.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.document.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.argumentLaw.deleteMany({ where: { argument: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.argumentIssue.deleteMany({ where: { argument: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.argumentFact.deleteMany({ where: { argument: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.lawIssue.deleteMany({ where: { law: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.issueFact.deleteMany({ where: { issue: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.factEvidence.deleteMany({ where: { fact: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.argument.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.law.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.issue.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.fact.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.evidence.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.material.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.matter.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await seedMatter(MATTER_ID, true)
  await seedMatter(OTHER_MATTER_ID, false)
})

afterAll(async () => {
  await prisma.documentLaw.deleteMany({ where: { document: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.documentIssue.deleteMany({ where: { document: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.documentFact.deleteMany({ where: { document: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.documentArgument.deleteMany({ where: { document: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await (prisma as any).documentDraft.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.document.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.argumentLaw.deleteMany({ where: { argument: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.argumentIssue.deleteMany({ where: { argument: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.argumentFact.deleteMany({ where: { argument: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.lawIssue.deleteMany({ where: { law: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.issueFact.deleteMany({ where: { issue: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.factEvidence.deleteMany({ where: { fact: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } } }).catch(() => {})
  await prisma.argument.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.law.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.issue.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.fact.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.evidence.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.material.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.matter.deleteMany({ where: { matter_id: { in: [MATTER_ID, OTHER_MATTER_ID] } } }).catch(() => {})
  await prisma.$disconnect()
  await app.close()
})

describe('Document Draft Workflow', () => {
  it('rejects generation without formal arguments', async () => {
    const res = await app.inject({ method: 'POST', url: `/matters/${OTHER_MATTER_ID}/document-drafts/generate`, payload: { document_type: 'complaint' } })
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.body).error).toBe('formal_arguments_required')
  })

  it('generates persistent complaint draft without creating a formal document', async () => {
    const res = await app.inject({ method: 'POST', url: `/matters/${MATTER_ID}/document-drafts/generate`, payload: { document_type: 'complaint' } })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.document_draft.title).toContain('民事起诉状')
    expect(body.document_draft.content).toContain('诉讼请求')
    expect(body.document_draft.content).toContain('【待律师补充：')
    expectSubmissionReadyComplaint(body.document_draft.content)
    expect(body.document_draft.source_argument_ids).toEqual([`${MATTER_ID}-arg-1`])
    expect(await prisma.document.count({ where: { matter_id: MATTER_ID } })).toBe(0)

    const again = await app.inject({ method: 'POST', url: `/matters/${MATTER_ID}/document-drafts/generate`, payload: { document_type: 'complaint' } })
    expect(JSON.parse(again.body).idempotent).toBe(true)
    expect(await (prisma as any).documentDraft.count({ where: { matter_id: MATTER_ID } })).toBe(1)
  })

  it('keeps documents/analyze compatible without creating formal documents', async () => {
    const before = await prisma.document.count({ where: { matter_id: MATTER_ID } })
    const res = await app.inject({ method: 'POST', url: `/matters/${MATTER_ID}/documents/analyze`, payload: { document_type: 'complaint' } })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.documentDraftId).toBeTruthy()
    expect(await prisma.document.count({ where: { matter_id: MATTER_ID } })).toBe(before)
  })

  it('patches regenerates publishes and exports a formal document with source links', async () => {
    const draft = await (prisma as any).documentDraft.findFirst({ where: { matter_id: MATTER_ID } })
    const generatedPublish = await app.inject({ method: 'POST', url: `/matters/${MATTER_ID}/document-drafts/${draft.id}/publish` })
    expect(generatedPublish.statusCode).toBe(409)
    expect(await prisma.document.count({ where: { matter_id: MATTER_ID } })).toBe(0)
    expect(await prisma.documentArgument.count({ where: { document: { matter_id: MATTER_ID } } })).toBe(0)
    expect(await prisma.documentFact.count({ where: { document: { matter_id: MATTER_ID } } })).toBe(0)
    expect(await prisma.documentIssue.count({ where: { document: { matter_id: MATTER_ID } } })).toBe(0)
    expect(await prisma.documentLaw.count({ where: { document: { matter_id: MATTER_ID } } })).toBe(0)

    const crossDraft = await app.inject({ method: 'POST', url: `/matters/${OTHER_MATTER_ID}/document-drafts/${draft.id}/publish` })
    expect(crossDraft.statusCode).toBe(403)
    const patch = await app.inject({
      method: 'PATCH',
      url: `/matters/${MATTER_ID}/document-drafts/${draft.id}`,
      payload: { content: `${draft.content}\n律师补充段落`, lawyer_note: '强化本金请求' },
    })
    expect(patch.statusCode).toBe(200)
    expect(JSON.parse(patch.body).review_status).toBe('editing')
    const editingPublish = await app.inject({ method: 'POST', url: `/matters/${MATTER_ID}/document-drafts/${draft.id}/publish` })
    expect(editingPublish.statusCode).toBe(409)

    for (const reviewStatus of ['pending', 'accepted']) {
      await (prisma as any).documentDraft.update({ where: { id: draft.id }, data: { review_status: reviewStatus } })
      const rejected = await app.inject({ method: 'POST', url: `/matters/${MATTER_ID}/document-drafts/${draft.id}/publish` })
      expect(rejected.statusCode).toBe(409)
      const unchanged = await (prisma as any).documentDraft.findUnique({ where: { id: draft.id } })
      expect(unchanged.published_document_id).toBeNull()
      expect(unchanged.published_at).toBeNull()
      expect(await prisma.document.count({ where: { matter_id: MATTER_ID } })).toBe(0)
    }
    await (prisma as any).documentDraft.update({ where: { id: draft.id }, data: { review_status: 'editing' } })

    const regen = await app.inject({
      method: 'POST',
      url: `/matters/${MATTER_ID}/document-drafts/${draft.id}/regenerate`,
      payload: { lawyer_note: '强化本金请求' },
    })
    expect(regen.statusCode).toBe(200)
    expect(await (prisma as any).documentDraft.count({ where: { matter_id: MATTER_ID } })).toBe(1)

    const ready = await app.inject({
      method: 'PATCH',
      url: `/matters/${MATTER_ID}/document-drafts/${draft.id}`,
      payload: { review_status: 'ready_to_publish' },
    })
    expect(ready.statusCode).toBe(200)

    const publish = await app.inject({ method: 'POST', url: `/matters/${MATTER_ID}/document-drafts/${draft.id}/publish` })
    expect(publish.statusCode, publish.body).toBe(200)
    const published = JSON.parse(publish.body)
    expect(published.document.status).toBe('published')
    expect(published.document_argument_links).toBe(1)
    expect(published.document_fact_links).toBe(1)
    expect(published.document_issue_links).toBe(1)
    expect(published.document_law_links).toBe(1)
    expect(await prisma.document.count({ where: { matter_id: MATTER_ID } })).toBe(1)

    const publishAgain = await app.inject({ method: 'POST', url: `/matters/${MATTER_ID}/document-drafts/${draft.id}/publish` })
    expect(publishAgain.statusCode).toBe(200)
    const publishedAgain = JSON.parse(publishAgain.body)
    expect(publishedAgain.idempotent).toBe(true)
    expect(publishedAgain.document.document_id).toBe(published.document.document_id)
    expect(publishedAgain.document.status).toBe('published')
    expect(await prisma.document.count({ where: { matter_id: MATTER_ID } })).toBe(1)
    expect(await prisma.documentArgument.count({ where: { document_id: published.document.document_id } })).toBe(1)
    expect(await prisma.documentFact.count({ where: { document_id: published.document.document_id } })).toBe(1)
    expect(await prisma.documentIssue.count({ where: { document_id: published.document.document_id } })).toBe(1)
    expect(await prisma.documentLaw.count({ where: { document_id: published.document.document_id } })).toBe(1)

    const updateAfterPublish = await app.inject({ method: 'PATCH', url: `/matters/${MATTER_ID}/document-drafts/${draft.id}`, payload: { title: '不能修改' } })
    expect(updateAfterPublish.statusCode).toBe(409)

    const exported = await app.inject({ method: 'GET', url: `/matters/${MATTER_ID}/documents/${published.document.document_id}/export.docx` })
    expect(exported.statusCode).toBe(200)
    expect(exported.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    expect(Buffer.from(exported.rawPayload).slice(0, 2).toString()).toBe('PK')
    expectSubmissionReadyComplaint(Buffer.from(exported.rawPayload).toString('utf8'))
    expect(await prisma.documentArgument.count({ where: { document_id: published.document.document_id } })).toBe(1)
    expect(await prisma.documentFact.count({ where: { document_id: published.document.document_id } })).toBe(1)
    expect(await prisma.documentIssue.count({ where: { document_id: published.document.document_id } })).toBe(1)
    expect(await prisma.documentLaw.count({ where: { document_id: published.document.document_id } })).toBe(1)

    const crossRead = await app.inject({ method: 'GET', url: `/matters/${OTHER_MATTER_ID}/documents/${published.document.document_id}` })
    expect(crossRead.statusCode).toBe(400)
    const crossExport = await app.inject({ method: 'GET', url: `/matters/${OTHER_MATTER_ID}/documents/${published.document.document_id}/export.docx` })
    expect(crossExport.statusCode).toBe(400)
  })

  it('rolls back source validation failures and rejects missing published objects', async () => {
    const invalidSourceDraft = await (prisma as any).documentDraft.create({
      data: {
        matter_id: OTHER_MATTER_ID,
        document_type: 'complaint',
        title: '跨案件来源文书',
        content: '民事起诉状\n诉讼请求：请求支持诉讼请求。\n事实与理由：本文书仅用于回归测试。',
        source_argument_ids: [`${MATTER_ID}-arg-1`],
        source_fact_ids: [], source_issue_ids: [], source_law_ids: [],
        review_status: 'ready_to_publish',
      },
    })
    const invalidSource = await app.inject({ method: 'POST', url: `/matters/${OTHER_MATTER_ID}/document-drafts/${invalidSourceDraft.id}/publish` })
    expect(invalidSource.statusCode).toBe(400)
    expect(await prisma.document.count({ where: { matter_id: OTHER_MATTER_ID } })).toBe(0)
    expect(await prisma.documentArgument.count({ where: { document: { matter_id: OTHER_MATTER_ID } } })).toBe(0)
    const sourceFailed = await (prisma as any).documentDraft.findUnique({ where: { id: invalidSourceDraft.id } })
    expect(sourceFailed.published_document_id).toBeNull()
    expect(sourceFailed.published_at).toBeNull()

    const missingPublishedDraft = await (prisma as any).documentDraft.create({
      data: {
        matter_id: OTHER_MATTER_ID,
        document_type: 'complaint', title: '数据完整性测试', content: '民事起诉状\n诉讼请求：请求支持。\n事实与理由：用于验证数据完整性。',
        source_argument_ids: [], source_fact_ids: [], source_issue_ids: [], source_law_ids: [],
        review_status: 'ready_to_publish', published_document_id: 'missing-formal-document',
      },
    })
    const missingPublished = await app.inject({ method: 'POST', url: `/matters/${OTHER_MATTER_ID}/document-drafts/${missingPublishedDraft.id}/publish` })
    expect(missingPublished.statusCode).toBe(409)
    expect(await prisma.document.count({ where: { matter_id: OTHER_MATTER_ID } })).toBe(0)
    expect(await prisma.documentArgument.count({ where: { document: { matter_id: OTHER_MATTER_ID } } })).toBe(0)
    expect(await prisma.documentFact.count({ where: { document: { matter_id: OTHER_MATTER_ID } } })).toBe(0)
    expect(await prisma.documentIssue.count({ where: { document: { matter_id: OTHER_MATTER_ID } } })).toBe(0)
    expect(await prisma.documentLaw.count({ where: { document: { matter_id: OTHER_MATTER_ID } } })).toBe(0)
    const integrityFailed = await (prisma as any).documentDraft.findUnique({ where: { id: missingPublishedDraft.id } })
    expect(integrityFailed.published_document_id).toBe('missing-formal-document')
    expect(integrityFailed.published_at).toBeNull()
  })

  it('rejects published document pointers from another matter or with a non-formal status', async () => {
    const crossMatterDocument = await prisma.document.create({
      data: {
        document_id: `${OTHER_MATTER_ID}-published-pointer`, matter_id: OTHER_MATTER_ID,
        title: '其他案件正式文书', document_type: 'complaint', content_uri: '', content: '其他案件文书', status: 'published', version: 'v1',
      },
    })
    const crossMatterPointer = await (prisma as any).documentDraft.create({
      data: {
        matter_id: MATTER_ID, document_type: 'complaint', title: '跨案件审计指针', content: '不得重新发布',
        source_argument_ids: [], source_fact_ids: [], source_issue_ids: [], source_law_ids: [],
        review_status: 'published', published_document_id: crossMatterDocument.document_id,
      },
    })
    const crossDocumentCount = await prisma.document.count()
    const crossArgumentLinks = await prisma.documentArgument.count()
    const crossFactLinks = await prisma.documentFact.count()
    const crossIssueLinks = await prisma.documentIssue.count()
    const crossLawLinks = await prisma.documentLaw.count()
    const crossMatterResponse = await app.inject({ method: 'POST', url: `/matters/${MATTER_ID}/document-drafts/${crossMatterPointer.id}/publish` })
    expect(crossMatterResponse.statusCode).toBe(409)
    expect(crossMatterResponse.statusCode).not.toBe(500)
    expect(JSON.parse(crossMatterResponse.body).error).toBe('published_document_matter_mismatch')
    expect(await prisma.document.count()).toBe(crossDocumentCount)
    expect(await prisma.documentArgument.count()).toBe(crossArgumentLinks)
    expect(await prisma.documentFact.count()).toBe(crossFactLinks)
    expect(await prisma.documentIssue.count()).toBe(crossIssueLinks)
    expect(await prisma.documentLaw.count()).toBe(crossLawLinks)
    const crossMatterUnchanged = await (prisma as any).documentDraft.findUnique({ where: { id: crossMatterPointer.id } })
    expect(crossMatterUnchanged.published_document_id).toBe(crossMatterDocument.document_id)
    expect(crossMatterUnchanged.published_at).toBeNull()

    const nonFormalDocument = await prisma.document.create({
      data: {
        document_id: `${MATTER_ID}-draft-pointer`, matter_id: MATTER_ID,
        title: '非正式文书', document_type: 'complaint', content_uri: '', content: '尚未正式发布', status: 'draft', version: 'v1',
      },
    })
    const nonFormalPointer = await (prisma as any).documentDraft.create({
      data: {
        matter_id: MATTER_ID, document_type: 'complaint', title: '非正式状态审计指针', content: '不得返回幂等成功',
        source_argument_ids: [], source_fact_ids: [], source_issue_ids: [], source_law_ids: [],
        review_status: 'published', published_document_id: nonFormalDocument.document_id,
      },
    })
    const invalidStatusDocumentCount = await prisma.document.count()
    const invalidStatusArgumentLinks = await prisma.documentArgument.count()
    const invalidStatusFactLinks = await prisma.documentFact.count()
    const invalidStatusIssueLinks = await prisma.documentIssue.count()
    const invalidStatusLawLinks = await prisma.documentLaw.count()
    const invalidStatusResponse = await app.inject({ method: 'POST', url: `/matters/${MATTER_ID}/document-drafts/${nonFormalPointer.id}/publish` })
    expect(invalidStatusResponse.statusCode).toBe(409)
    expect(invalidStatusResponse.statusCode).not.toBe(500)
    expect(JSON.parse(invalidStatusResponse.body).error).toBe('published_document_invalid_status')
    expect(await prisma.document.count()).toBe(invalidStatusDocumentCount)
    expect(await prisma.documentArgument.count()).toBe(invalidStatusArgumentLinks)
    expect(await prisma.documentFact.count()).toBe(invalidStatusFactLinks)
    expect(await prisma.documentIssue.count()).toBe(invalidStatusIssueLinks)
    expect(await prisma.documentLaw.count()).toBe(invalidStatusLawLinks)
    const nonFormalUnchanged = await (prisma as any).documentDraft.findUnique({ where: { id: nonFormalPointer.id } })
    expect(nonFormalUnchanged.published_document_id).toBe(nonFormalDocument.document_id)
    expect(nonFormalUnchanged.published_at).toBeNull()
  })

  it('rolls back the whole batch when a later published pointer is missing', async () => {
    const firstDraft = await (prisma as any).documentDraft.create({
      data: {
        matter_id: MATTER_ID, document_type: 'complaint', title: '批量事务第一份文书',
        content: '民事起诉状\n原告基本信息：【待律师补充】\n被告基本信息：【待律师补充】\n诉讼请求：请求依法支持。\n事实与理由：用于验证事务回滚。\n证据和证据来源：【待律师补充】\n此致\n【待律师确认：管辖法院】',
        source_argument_ids: [`${MATTER_ID}-arg-1`], source_fact_ids: [`${MATTER_ID}-fact-1`],
        source_issue_ids: [`${MATTER_ID}-issue-1`], source_law_ids: [`${MATTER_ID}-law-1`], review_status: 'ready_to_publish',
      },
    })
    const brokenDraft = await (prisma as any).documentDraft.create({
      data: {
        matter_id: MATTER_ID, document_type: 'complaint', title: '批量事务损坏指针', content: '不得重新创建正式文书',
        source_argument_ids: [], source_fact_ids: [], source_issue_ids: [], source_law_ids: [],
        review_status: 'published', published_document_id: 'missing-batch-formal-document',
      },
    })
    const documentCount = await prisma.document.count({ where: { matter_id: MATTER_ID } })
    const argumentLinkCount = await prisma.documentArgument.count({ where: { document: { matter_id: MATTER_ID } } })
    const factLinkCount = await prisma.documentFact.count({ where: { document: { matter_id: MATTER_ID } } })
    const issueLinkCount = await prisma.documentIssue.count({ where: { document: { matter_id: MATTER_ID } } })
    const lawLinkCount = await prisma.documentLaw.count({ where: { document: { matter_id: MATTER_ID } } })

    await expect(documentDraftService.publishDrafts(MATTER_ID, [firstDraft.id, brokenDraft.id])).rejects.toMatchObject({ code: 'published_document_not_found' })

    expect(await prisma.document.count({ where: { matter_id: MATTER_ID } })).toBe(documentCount)
    expect(await prisma.documentArgument.count({ where: { document: { matter_id: MATTER_ID } } })).toBe(argumentLinkCount)
    expect(await prisma.documentFact.count({ where: { document: { matter_id: MATTER_ID } } })).toBe(factLinkCount)
    expect(await prisma.documentIssue.count({ where: { document: { matter_id: MATTER_ID } } })).toBe(issueLinkCount)
    expect(await prisma.documentLaw.count({ where: { document: { matter_id: MATTER_ID } } })).toBe(lawLinkCount)
    const firstAfterRollback = await (prisma as any).documentDraft.findUnique({ where: { id: firstDraft.id } })
    expect(firstAfterRollback.published_document_id).toBeNull()
    expect(firstAfterRollback.published_at).toBeNull()
    const brokenAfterRollback = await (prisma as any).documentDraft.findUnique({ where: { id: brokenDraft.id } })
    expect(brokenAfterRollback.published_document_id).toBe('missing-batch-formal-document')
    expect(brokenAfterRollback.published_at).toBeNull()
  })
})
