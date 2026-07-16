import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import buildApp from '../src/server'
import { createPrismaClient } from '@lawdesk/database'
import { MockLlmAdapter } from '../src/ai/mockLlmAdapter'
import { buildDeterministicLawCandidates } from '../src/services/ai/legalRuleClassifier'
import { assertFormalLawContent, normalizeLawSuggestionsForDrafts } from '../src/services/lawDraftService'
import { inferIssueTypeFromFacts } from '../src/services/ai/legalConceptClassifier'

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const matterId = `test-law-draft-${RUN_ID}`
const otherMatterId = `test-law-draft-other-${RUN_ID}`

let app: any
let prisma: any

async function cleanup(id: string) {
  await prisma.lawIssue.deleteMany({ where: { OR: [{ issue: { matter_id: id } }, { law: { matter_id: id } }] } }).catch(() => {})
  await prisma.lawDraft.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.law.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.issueFact.deleteMany({ where: { issue: { matter_id: id } } }).catch(() => {})
  await prisma.issueDraft.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.issue.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.factEvidence.deleteMany({ where: { fact: { matter_id: id } } }).catch(() => {})
  await prisma.factDraft.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.fact.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.evidence.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.material.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.matter.deleteMany({ where: { matter_id: id } }).catch(() => {})
}

async function seedMatter(id: string, issueCount = 0) {
  await prisma.matter.create({ data: { matter_id: id, title: `Law Draft ${id}`, description: '', matter_type: 'test', status: 'active' } })
  for (let index = 0; index < issueCount; index += 1) {
    const issue = await prisma.issue.create({
      data: {
        issue_id: `issue-${id}-${index}`,
        matter_id: id,
        title: ['双方是否成立民间借贷法律关系', '出借人是否已经完成借款交付义务', '借款人是否构成到期未还的违约'][index] || `争议焦点 ${index + 1}`,
        description: ['需要判断借贷合意与合同成立。', '需要判断资金是否实际交付。', '需要判断到期未还是否构成违约。'][index] || '正式争议焦点',
        status: 'active',
      },
    })
    const fact = await prisma.fact.create({
      data: {
        fact_id: `fact-${id}-${index}`,
        matter_id: id,
        title: ['双方形成借贷合意', '款项已经通过银行转账交付', '债务到期后仍未清偿'][index] || `普通事实 ${index + 1}`,
        description: ['借条反映合同成立。', '银行流水反映资金到账。', '催收后仍未还款并构成违约。'][index] || '普通正式事实',
        status: 'active',
      },
    })
    await prisma.issueFact.create({ data: { issue_id: issue.issue_id, fact_id: fact.fact_id } })
  }
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must explicitly target the isolated RC test database')
  if (new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '') !== 'lawdesk_rc_test') throw new Error('Draft workflow tests require DATABASE_URL to target lawdesk_rc_test')
  process.env.AI_PROVIDER = 'mock'
  process.env.MINIMAX_API_KEY = ''
  prisma = createPrismaClient()
  await cleanup(matterId)
  await cleanup(otherMatterId)
  app = await buildApp()
})

afterAll(async () => {
  await cleanup(matterId)
  await cleanup(otherMatterId)
  await app.close()
  await prisma.$disconnect()
})

describe('Persisted Laws Draft Workflow', () => {
  it('recovers one Issue type only from consistent formal source Facts', () => {
    expect(inferIssueTypeFromFacts([{ title: '双方形成借贷合意' }])).toBe('agreement')
    expect(inferIssueTypeFromFacts([{ title: '款项已经通过银行转账交付' }])).toBe('delivery')
    expect(inferIssueTypeFromFacts([{ title: '债务到期后仍未清偿' }])).toBe('default')
    expect(inferIssueTypeFromFacts([])).toBeNull()
    expect(inferIssueTypeFromFacts([{ title: '形成借贷合意' }, { title: '款项已经转账交付' }])).toBeNull()
  })

  it('builds deterministic Laws by issue_type regardless of Issue order', async () => {
    const adapter = new MockLlmAdapter()
    const issues = [
      { issue_id: 'issue-agreement', issue_type: 'agreement' as const },
      { issue_id: 'issue-delivery', issue_type: 'delivery' as const },
      { issue_id: 'issue-default', issue_type: 'default' as const },
    ]
    const generate = async (input: typeof issues) => (await adapter.generate({
      task: 'analyze_laws',
      matter_id: 'generic-matter',
      prompt_version: 'law-draft-v1',
      issues: input,
      context_pack: { matter: { title: '不参与 Law 分类的案件标题' } },
    })).response.laws

    const first = await generate(issues)
    const second = await generate([issues[2], issues[0], issues[1]])
    expect(second).toEqual(first)
    expect(first.map((law: any) => law.issue_type)).toEqual(['agreement', 'delivery', 'default'])
    expect(first.map((law: any) => law.source_issue_ids)).toEqual([
      ['issue-agreement'],
      ['issue-delivery'],
      ['issue-default'],
    ])
    expect(`${first[0].title}\n${first[0].rule_content}\n${first[0].application}`).toMatch(/借款合同.*成立|合同成立/)
    expect(`${first[0].title}\n${first[0].rule_content}\n${first[0].application}`).toMatch(/借贷关系.*成立|借贷关系是否依法成立/)
    expect(`${first[0].title}\n${first[0].rule_content}\n${first[0].application}`).toMatch(/借贷合意/)
    expect(`${first[0].rule_content}\n${first[0].application}\n${first[0].limitations}`).toMatch(/借款合同/)
    expect(`${first[0].rule_content}\n${first[0].application}\n${first[0].limitations}`).toMatch(/民间借贷关系/)
    expect(`${first[0].rule_content}\n${first[0].application}\n${first[0].limitations}`).toMatch(/借据/)
    expect(`${first[0].rule_content}\n${first[0].application}\n${first[0].limitations}`).toMatch(/聊天记录/)
    expect(`${first[0].rule_content}\n${first[0].application}\n${first[0].limitations}`).toMatch(/实际履行/)
    expect(`${first[0].rule_content}\n${first[0].application}\n${first[0].limitations}`).toMatch(/综合判断/)
    expect(`${first[1].title}\n${first[1].rule_content}\n${first[1].application}`).toMatch(/资金交付/)
    expect(`${first[1].title}\n${first[1].rule_content}\n${first[1].application}`).toMatch(/转账/)
    expect(`${first[1].title}\n${first[1].rule_content}\n${first[1].application}`).toMatch(/举证责任/)
    expect(`${first[1].rule_content}\n${first[1].application}\n${first[1].limitations}`).toMatch(/银行流水/)
    expect(`${first[1].rule_content}\n${first[1].application}\n${first[1].limitations}`).toMatch(/转账记录/)
    expect(`${first[1].rule_content}\n${first[1].application}\n${first[1].limitations}`).toMatch(/举证/)
    expect(`${first[2].title}\n${first[2].rule_content}\n${first[2].application}`).toMatch(/到期/)
    expect(`${first[2].title}\n${first[2].rule_content}\n${first[2].application}`).toMatch(/未履行/)
    expect(`${first[2].title}\n${first[2].rule_content}\n${first[2].application}`).toMatch(/违约责任/)
    expect(`${first[2].title}\n${first[2].rule_content}\n${first[2].application}`).toMatch(/利息责任/)
  })

  it('aggregates duplicate Issue types into one Law with sorted sources', () => {
    const laws = buildDeterministicLawCandidates([
      { issue_id: 'delivery-b', issue_type: 'delivery' },
      { issue_id: 'delivery-a', issue_type: 'delivery' },
    ])
    expect(laws).toHaveLength(1)
    expect(laws[0].issue_type).toBe('delivery')
    expect(laws[0].source_issue_ids).toEqual(['delivery-a', 'delivery-b'])
  })

  it('rejects missing, invalid or concept-mismatched source Issue IDs', () => {
    const issues = [
      {
        issue_id: 'issue-agreement',
        facts: [{ fact: { title: '双方形成借贷合意' } }],
      },
      {
        issue_id: 'issue-delivery',
        facts: [{ fact: { title: '资金已经通过银行转账交付' } }],
      },
    ]
    const base = {
      title: '借贷关系规则',
      citation: '《中华人民共和国民法典》第六百六十七条',
      rule_content: '借款合同依法成立后对当事人具有约束力。',
      issue_type: 'agreement',
    }
    expect(normalizeLawSuggestionsForDrafts([{ ...base, source_issue_ids: [] }], issues)).toEqual([])
    expect(normalizeLawSuggestionsForDrafts([{ ...base, source_issue_ids: ['missing'] }], issues)).toEqual([])
    expect(normalizeLawSuggestionsForDrafts([{ ...base, source_issue_ids: ['issue-delivery'] }], issues)).toEqual([])
    expect(normalizeLawSuggestionsForDrafts([{ ...base, source_issue_ids: ['issue-agreement'] }], issues)).toHaveLength(1)
  })

  it('rejects unsafe Law placeholders and keeps generic rules free of case details', () => {
    for (const unsafe of ['第X条', '第Y条', 'TODO', 'placeholder']) {
      expect(() => assertFormalLawContent({ title: '规则', citation: unsafe, rule_content: '正式规则内容' })).toThrow()
    }
    const output = JSON.stringify(buildDeterministicLawCandidates([{ issue_id: 'generic-issue', issue_type: 'agreement' }]))
    expect(output).not.toMatch(/张建国|李海涛|2026年|100万元/)
  })

  it('rejects generation when no formal Issues exist', async () => {
    const emptyMatterId = `${matterId}-empty`
    await cleanup(emptyMatterId)
    await seedMatter(emptyMatterId, 0)

    const res = await app.inject({ method: 'POST', url: `/matters/${emptyMatterId}/law-drafts/generate`, payload: {} })

    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.body).error).toBe('formal_issues_required')
    await cleanup(emptyMatterId)
  })

  it('generates persistent law drafts idempotently from formal Issues', async () => {
    await cleanup(matterId)
    await seedMatter(matterId, 3)

    const first = await app.inject({ method: 'POST', url: `/matters/${matterId}/law-drafts/generate`, payload: {} })
    expect(first.statusCode).toBe(200)
    const firstBody = JSON.parse(first.body)
    expect(firstBody.idempotent).toBe(false)
    expect(firstBody.ai_audit).toEqual({ provider: 'mock', model: 'mock-lawdesk-v1', prompt_version: 'law-draft-v1', fallback_used: false })
    expect(firstBody.law_drafts.length).toBe(3)
    expect(firstBody.law_drafts.every((draft: any) => draft.review_status === 'pending')).toBe(true)
    expect(firstBody.law_drafts.every((draft: any) => Array.isArray(draft.source_issue_ids) && draft.source_issue_ids.length > 0)).toBe(true)
    expect(firstBody.law_drafts.every((draft: any) => draft.rule_content && draft.application && draft.limitations)).toBe(true)

    const second = await app.inject({ method: 'POST', url: `/matters/${matterId}/law-drafts/generate`, payload: {} })
    expect(second.statusCode).toBe(200)
    const secondBody = JSON.parse(second.body)
    expect(secondBody.idempotent).toBe(true)
    expect(secondBody.ai_audit).toBeNull()
    expect(secondBody.law_drafts.map((draft: any) => draft.id)).toEqual(firstBody.law_drafts.map((draft: any) => draft.id))

    const count = await prisma.lawDraft.count({ where: { matter_id: matterId } })
    expect(count).toBe(3)
  })

  it('supports accepted, edited and ignored review states and blocks cross-matter updates', async () => {
    const drafts = await prisma.lawDraft.findMany({ where: { matter_id: matterId }, orderBy: { created_at: 'asc' } })
    expect(drafts.length).toBe(3)

    const accept = await app.inject({
      method: 'PATCH',
      url: `/matters/${matterId}/law-drafts/${drafts[0].id}`,
      payload: { review_status: 'accepted' },
    })
    expect(accept.statusCode).toBe(200)
    expect(JSON.parse(accept.body).review_status).toBe('accepted')

    await cleanup(otherMatterId)
    await seedMatter(otherMatterId, 1)
    const cross = await app.inject({
      method: 'PATCH',
      url: `/matters/${otherMatterId}/law-drafts/${drafts[0].id}`,
      payload: { review_status: 'ignored' },
    })
    expect(cross.statusCode).toBe(403)

    const pendingPublish = await app.inject({ method: 'POST', url: `/matters/${matterId}/law-drafts/publish`, payload: {} })
    expect(pendingPublish.statusCode).toBe(409)
    expect(await prisma.law.count({ where: { matter_id: matterId } })).toBe(0)
    expect(await prisma.lawIssue.count({ where: { law: { matter_id: matterId } } })).toBe(0)
    expect(await prisma.lawDraft.count({ where: { matter_id: matterId, OR: [{ published_law_id: { not: null } }, { published_at: { not: null } }] } })).toBe(0)

    const edit = await app.inject({
      method: 'PATCH',
      url: `/matters/${matterId}/law-drafts/${drafts[1].id}`,
      payload: { title: '经律师修改的借款交付规则', application: '用于确认本案资金交付是否完成。' },
    })
    expect(edit.statusCode).toBe(200)
    expect(JSON.parse(edit.body).review_status).toBe('edited')
    const editedPublish = await app.inject({ method: 'POST', url: `/matters/${matterId}/law-drafts/publish`, payload: {} })
    expect(editedPublish.statusCode).toBe(409)
    expect(await prisma.law.count({ where: { matter_id: matterId } })).toBe(0)
    expect(await prisma.lawIssue.count({ where: { law: { matter_id: matterId } } })).toBe(0)
    expect(await prisma.lawDraft.count({ where: { matter_id: matterId, OR: [{ published_law_id: { not: null } }, { published_at: { not: null } }] } })).toBe(0)
    const acceptEdited = await app.inject({ method: 'PATCH', url: `/matters/${matterId}/law-drafts/${drafts[1].id}`, payload: { review_status: 'accepted' } })
    expect(acceptEdited.statusCode).toBe(200)
    expect(JSON.parse(acceptEdited.body).review_status).toBe('accepted')

    const ignore = await app.inject({
      method: 'PATCH',
      url: `/matters/${matterId}/law-drafts/${drafts[2].id}`,
      payload: { review_status: 'ignored' },
    })
    expect(ignore.statusCode).toBe(200)
    expect(JSON.parse(ignore.body).review_status).toBe('ignored')
  })

  it('publishes reviewed drafts to formal Laws and law_issue idempotently', async () => {
    const publish = await app.inject({ method: 'POST', url: `/matters/${matterId}/law-drafts/publish`, payload: {} })
    expect(publish.statusCode).toBe(200)
    const body = JSON.parse(publish.body)
    expect(body.created_laws.length).toBe(2)
    expect(body.ignored_count).toBe(1)
    expect(body.links_count).toBeGreaterThan(0)

    const lawCount = await prisma.law.count({ where: { matter_id: matterId } })
    const linkCount = await prisma.lawIssue.count({ where: { law: { matter_id: matterId } } })
    expect(lawCount).toBe(2)
    expect(linkCount).toBeGreaterThan(0)

    const drafts = await prisma.lawDraft.findMany({ where: { matter_id: matterId } })
    const alreadyPublished = drafts.find((draft: any) => draft.published_law_id)
    expect(alreadyPublished).toBeTruthy()
    const modifyPublished = await app.inject({
      method: 'PATCH',
      url: `/matters/${matterId}/law-drafts/${alreadyPublished.id}`,
      payload: { review_status: 'ignored' },
    })
    expect(modifyPublished.statusCode).toBe(409)

    const repeat = await app.inject({ method: 'POST', url: `/matters/${matterId}/law-drafts/publish`, payload: {} })
    expect(repeat.statusCode).toBe(200)
    const repeatLawCount = await prisma.law.count({ where: { matter_id: matterId } })
    const repeatLinkCount = await prisma.lawIssue.count({ where: { law: { matter_id: matterId } } })
    expect(repeatLawCount).toBe(2)
    expect(repeatLinkCount).toBe(linkCount)
  })

  it('rejects draft sources that do not belong to the matter during publish', async () => {
    const badMatterId = `${matterId}-bad-source`
    const otherId = `${matterId}-source-other`
    await cleanup(badMatterId)
    await cleanup(otherId)
    await seedMatter(badMatterId, 1)
    await seedMatter(otherId, 1)
    const localIssue = await prisma.issue.findFirst({ where: { matter_id: badMatterId } })
    const otherIssue = await prisma.issue.findFirst({ where: { matter_id: otherId } })
    await prisma.lawDraft.create({ data: { matter_id: badMatterId, title: '案内法律依据', citation: '民法典第一条', rule_content: '正式法律规则内容', application: '适用于本案', source_issue_ids: [localIssue.issue_id], review_status: 'accepted' } })
    await prisma.lawDraft.create({
      data: {
        matter_id: badMatterId,
        title: '跨案件争议焦点不应写入关联',
        citation: '测试法条',
        rule_content: '规则',
        application: '适用',
        limitations: '风险',
        source_issue_ids: [otherIssue.issue_id],
        review_status: 'accepted',
      },
    })

    const publish = await app.inject({ method: 'POST', url: `/matters/${badMatterId}/law-drafts/publish`, payload: {} })
    expect(publish.statusCode).toBe(400)
    expect(JSON.parse(publish.body).error).toBe('invalid_source_issue_ids')
    const linkCount = await prisma.lawIssue.count({ where: { law: { matter_id: badMatterId } } })
    expect(linkCount).toBe(0)
    expect(await prisma.law.count({ where: { matter_id: badMatterId } })).toBe(0)
    expect(await prisma.lawDraft.count({ where: { matter_id: badMatterId, OR: [{ published_law_id: { not: null } }, { published_at: { not: null } }] } })).toBe(0)
    await cleanup(badMatterId)
    await cleanup(otherId)
  })

  it('does not create formal Laws during Intake Matter Create', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/intake/ai-create-matter',
      payload: {
        title: `Matter Create Law Guard ${RUN_ID}`,
        client_name: '委托人',
        opponent_name: '对方',
        matter_type: '测试',
        case_summary: '用于确认 Matter Create 阶段不提前写入正式 Laws。',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.ai_created?.laws_count || 0).toBe(0)
    const laws = await prisma.law.count({ where: { matter_id: body.matter_id } })
    expect(laws).toBe(0)
    await cleanup(body.matter_id)
  })
})
