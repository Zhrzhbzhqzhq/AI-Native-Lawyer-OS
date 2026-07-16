import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import buildApp from '../src/server'
import { createPrismaClient } from '@lawdesk/database'
import { normalizeIssueSuggestionsForDrafts } from '../src/services/issueDraftService'

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const matterId = `test-issue-draft-${RUN_ID}`
const otherMatterId = `test-issue-draft-other-${RUN_ID}`

let app: any
let prisma: any

const normalizationFacts = [
  { fact_id: 'fact-agreement', matter_id: 'm', title: '双方达成借款合意', description: '出借人与借款人之间形成民间借贷关系。', status: 'active' },
  { fact_id: 'fact-delivery', matter_id: 'm', title: '借款资金已经交付', description: '出借人已经通过转账方式完成借款交付。', status: 'active' },
  { fact_id: 'fact-default', matter_id: 'm', title: '借款到期后尚未偿还', description: '借款到期后借款人未偿还，出借人曾催收。', status: 'active' },
]

async function cleanup(id: string) {
  await prisma.issueFact.deleteMany({ where: { OR: [{ fact: { matter_id: id } }, { issue: { matter_id: id } }] } }).catch(() => {})
  await prisma.issueDraft.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.issue.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.factEvidence.deleteMany({ where: { fact: { matter_id: id } } }).catch(() => {})
  await prisma.factDraft.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.fact.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.evidence.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.material.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.matter.deleteMany({ where: { matter_id: id } }).catch(() => {})
}

async function seedMatter(id: string, factCount = 0) {
  await prisma.matter.create({ data: { matter_id: id, title: `Issue Draft ${id}`, description: '', matter_type: 'test', status: 'active' } })
  for (let index = 0; index < factCount; index += 1) {
    await prisma.fact.create({
      data: {
        fact_id: `fact-${id}-${index}`,
        matter_id: id,
        title: ['双方存在借贷合意', '出借人已经交付借款', '借款到期后仍未清偿'][index] || `事实 ${index + 1}`,
        description: ['借条、聊天记录共同证明借贷关系。', '银行流水证明资金已经支付。', '催收记录证明债务到期未还。'][index] || '正式事实',
        status: 'active',
      },
    })
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

describe('Persisted Issues Draft Workflow', () => {
  it('filters unsupported or untraceable issue candidates before persistence', () => {
    const result = normalizeIssueSuggestionsForDrafts([
      { title: '双方是否成立民间借贷法律关系', description: '应审查借贷合意。', source_fact_ids: ['fact-agreement'], confidence: 0.94 },
      { title: '缺少来源事实的争点', description: '没有 source_fact_ids。', confidence: 0.9 },
      { title: '跨案件事实争点', description: '引用无效事实。', source_fact_ids: ['fact-other'], confidence: 0.9 },
      { title: '是否构成夫妻共同债务', description: '应审查配偶是否共同承担。', source_fact_ids: ['fact-agreement'], confidence: 0.8 },
    ], normalizationFacts)

    expect(result.drafts.map((draft) => draft.title)).toEqual(['双方是否成立民间借贷法律关系'])
    expect(result.warnings.join('\n')).toContain('missing_source_fact_ids')
    expect(result.warnings.join('\n')).toContain('invalid_source_fact_ids')
    expect(result.warnings.join('\n')).toContain('unsupported_concept:spouse_joint_debt')
  })

  it('deduplicates similar issues and applies the max draft cap', () => {
    const result = normalizeIssueSuggestionsForDrafts([
      { title: '双方是否成立民间借贷法律关系', description: '应审查借贷合意。', source_fact_ids: ['fact-agreement'], confidence: 0.91 },
      { title: '是否成立民间借贷法律关系', description: '应审查双方借贷合意。', source_fact_ids: ['fact-agreement'], confidence: 0.9 },
      { title: '出借人是否已经完成借款交付义务', description: '应审查资金交付。', source_fact_ids: ['fact-delivery'], confidence: 0.9 },
      { title: '借款人是否构成到期未还的违约', description: '应审查到期未还。', source_fact_ids: ['fact-default'], confidence: 0.88 },
      { title: '利息责任应如何认定', description: '应审查逾期责任。', source_fact_ids: ['fact-default'], confidence: 0.7 },
      { title: '诉讼时效是否届满', description: '应审查是否超过诉讼时效。', source_fact_ids: ['fact-default'], confidence: 0.6 },
    ], normalizationFacts, 3)

    expect(result.drafts.length).toBe(3)
    expect(result.drafts.map((draft) => draft.title)).toEqual([
      '双方是否成立民间借贷法律关系',
      '出借人是否已经完成借款交付义务',
      '借款人是否构成到期未还的违约',
    ])
    expect(result.warnings.join('\n')).toContain('candidate_duplicate')
    expect(result.warnings.join('\n')).toContain('truncated')
  })

  it('allows spouse or guarantee issues only when the linked formal Facts support them', () => {
    const supportedFacts = [
      ...normalizationFacts,
      { fact_id: 'fact-spouse', matter_id: 'm', title: '配偶共同签署借条', description: '借款人配偶共同签署借条并承诺共同还款。', status: 'active' },
      { fact_id: 'fact-guarantee', matter_id: 'm', title: '保证人出具保证承诺', description: '保证人明确承诺对借款承担连带保证责任。', status: 'active' },
    ]
    const result = normalizeIssueSuggestionsForDrafts([
      { title: '该债务是否属于夫妻共同债务', description: '需审查配偶共同签署事实。', source_fact_ids: ['fact-spouse'], confidence: 0.86 },
      { title: '保证人是否应承担保证责任', description: '需审查保证承诺效力。', source_fact_ids: ['fact-guarantee'], confidence: 0.84 },
      { title: '没有保证事实时是否承担保证责任', description: '无保证事实支撑。', source_fact_ids: ['fact-agreement'], confidence: 0.8 },
    ], supportedFacts)

    expect(result.drafts.map((draft) => draft.title)).toEqual([
      '该债务是否属于夫妻共同债务',
      '保证人是否应承担保证责任',
    ])
    expect(result.warnings.join('\n')).toContain('unsupported_concept:guarantee')
  })

  it('rejects generation when no formal Facts exist', async () => {
    const emptyMatterId = `${matterId}-empty`
    await cleanup(emptyMatterId)
    await seedMatter(emptyMatterId, 0)

    const res = await app.inject({ method: 'POST', url: `/matters/${emptyMatterId}/issue-drafts/generate`, payload: {} })

    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.body).error).toBe('formal_facts_required')
    await cleanup(emptyMatterId)
  })

  it('generates persistent issue drafts idempotently from formal Facts', async () => {
    await cleanup(matterId)
    await seedMatter(matterId, 3)

    const first = await app.inject({ method: 'POST', url: `/matters/${matterId}/issue-drafts/generate`, payload: {} })
    expect(first.statusCode).toBe(200)
    const firstBody = JSON.parse(first.body)
    expect(firstBody.idempotent).toBe(false)
    expect(firstBody.issue_drafts.length).toBe(3)
    expect(firstBody.issue_drafts.every((draft: any) => draft.review_status === 'pending')).toBe(true)
    expect(firstBody.issue_drafts.every((draft: any) => Array.isArray(draft.source_fact_ids) && draft.source_fact_ids.length > 0)).toBe(true)
    expect(new Set(firstBody.issue_drafts.map((draft: any) => draft.title)).size).toBe(3)
    expect(firstBody.issue_drafts.map((draft: any) => draft.title)).toEqual([
      '双方是否成立民间借贷法律关系',
      '出借人是否已经完成借款交付义务',
      '借款人是否构成到期未还的违约',
    ])

    const second = await app.inject({ method: 'POST', url: `/matters/${matterId}/issue-drafts/generate`, payload: {} })
    expect(second.statusCode).toBe(200)
    const secondBody = JSON.parse(second.body)
    expect(secondBody.idempotent).toBe(true)
    expect(secondBody.issue_drafts.map((draft: any) => draft.id)).toEqual(firstBody.issue_drafts.map((draft: any) => draft.id))

    const count = await prisma.issueDraft.count({ where: { matter_id: matterId } })
    expect(count).toBe(3)
  })

  it('supports accepted, edited and ignored review states and blocks cross-matter updates', async () => {
    const drafts = await prisma.issueDraft.findMany({ where: { matter_id: matterId }, orderBy: { created_at: 'asc' } })
    expect(drafts.length).toBe(3)

    const accept = await app.inject({
      method: 'PATCH',
      url: `/matters/${matterId}/issue-drafts/${drafts[0].id}`,
      payload: { review_status: 'accepted' },
    })
    expect(accept.statusCode).toBe(200)
    expect(JSON.parse(accept.body).review_status).toBe('accepted')

    await cleanup(otherMatterId)
    await seedMatter(otherMatterId, 1)
    const cross = await app.inject({
      method: 'PATCH',
      url: `/matters/${otherMatterId}/issue-drafts/${drafts[0].id}`,
      payload: { review_status: 'ignored' },
    })
    expect(cross.statusCode).toBe(403)

    const pendingPublish = await app.inject({ method: 'POST', url: `/matters/${matterId}/issue-drafts/publish`, payload: {} })
    expect(pendingPublish.statusCode).toBe(409)
    expect(await prisma.issue.count({ where: { matter_id: matterId } })).toBe(0)
    expect(await prisma.issueFact.count({ where: { issue: { matter_id: matterId } } })).toBe(0)
    expect(await prisma.issueDraft.count({ where: { matter_id: matterId, OR: [{ published_issue_id: { not: null } }, { published_at: { not: null } }] } })).toBe(0)

    const edit = await app.inject({
      method: 'PATCH',
      url: `/matters/${matterId}/issue-drafts/${drafts[1].id}`,
      payload: { title: '经律师修改的交付义务争点', description: '应审查出借人是否完成借款交付义务。' },
    })
    expect(edit.statusCode).toBe(200)
    expect(JSON.parse(edit.body).review_status).toBe('edited')
    const editedPublish = await app.inject({ method: 'POST', url: `/matters/${matterId}/issue-drafts/publish`, payload: {} })
    expect(editedPublish.statusCode).toBe(409)
    expect(await prisma.issue.count({ where: { matter_id: matterId } })).toBe(0)
    expect(await prisma.issueFact.count({ where: { issue: { matter_id: matterId } } })).toBe(0)
    expect(await prisma.issueDraft.count({ where: { matter_id: matterId, OR: [{ published_issue_id: { not: null } }, { published_at: { not: null } }] } })).toBe(0)
    const acceptEdited = await app.inject({ method: 'PATCH', url: `/matters/${matterId}/issue-drafts/${drafts[1].id}`, payload: { review_status: 'accepted' } })
    expect(acceptEdited.statusCode).toBe(200)
    expect(JSON.parse(acceptEdited.body).review_status).toBe('accepted')

    const ignore = await app.inject({
      method: 'PATCH',
      url: `/matters/${matterId}/issue-drafts/${drafts[2].id}`,
      payload: { review_status: 'ignored' },
    })
    expect(ignore.statusCode).toBe(200)
    expect(JSON.parse(ignore.body).review_status).toBe('ignored')
  })

  it('publishes reviewed drafts to formal Issues and issue_fact idempotently', async () => {
    const publish = await app.inject({ method: 'POST', url: `/matters/${matterId}/issue-drafts/publish`, payload: {} })
    expect(publish.statusCode).toBe(200)
    const body = JSON.parse(publish.body)
    expect(body.created_issues.length).toBe(2)
    expect(body.ignored_count).toBe(1)
    expect(body.links_count).toBeGreaterThan(0)

    const issueCount = await prisma.issue.count({ where: { matter_id: matterId } })
    const linkCount = await prisma.issueFact.count({ where: { issue: { matter_id: matterId } } })
    expect(issueCount).toBe(2)
    expect(linkCount).toBeGreaterThan(0)
    const formalIssues = await prisma.issue.findMany({ where: { matter_id: matterId } })
    expect(JSON.stringify(formalIssues)).not.toMatch(/source_fact_ids|confidence|ai_reasoning|review_status|published_issue_id/)

    const drafts = await prisma.issueDraft.findMany({ where: { matter_id: matterId } })
    const alreadyPublished = drafts.find((draft: any) => draft.published_issue_id)
    expect(alreadyPublished).toBeTruthy()
    const modifyPublished = await app.inject({
      method: 'PATCH',
      url: `/matters/${matterId}/issue-drafts/${alreadyPublished.id}`,
      payload: { review_status: 'ignored' },
    })
    expect(modifyPublished.statusCode).toBe(409)

    const repeat = await app.inject({ method: 'POST', url: `/matters/${matterId}/issue-drafts/publish`, payload: {} })
    expect(repeat.statusCode).toBe(200)
    const repeatIssueCount = await prisma.issue.count({ where: { matter_id: matterId } })
    expect(repeatIssueCount).toBe(2)
  })

  it('rejects draft sources that do not belong to the matter during publish', async () => {
    const badMatterId = `${matterId}-bad-source`
    const otherId = `${matterId}-source-other`
    await cleanup(badMatterId)
    await cleanup(otherId)
    await seedMatter(badMatterId, 1)
    await seedMatter(otherId, 1)
    const localFact = await prisma.fact.findFirst({ where: { matter_id: badMatterId } })
    const otherFact = await prisma.fact.findFirst({ where: { matter_id: otherId } })
    await prisma.issueDraft.create({ data: { matter_id: badMatterId, title: '案内事实争点', description: '合法草稿', source_fact_ids: [localFact.fact_id], review_status: 'accepted' } })
    await prisma.issueDraft.create({
      data: {
        matter_id: badMatterId,
        title: '跨案件事实不应写入关联',
        description: '',
        source_fact_ids: [otherFact.fact_id],
        review_status: 'accepted',
      },
    })

    const publish = await app.inject({ method: 'POST', url: `/matters/${badMatterId}/issue-drafts/publish`, payload: {} })
    expect(publish.statusCode).toBe(400)
    expect(JSON.parse(publish.body).error).toBe('invalid_source_fact_ids')
    const linkCount = await prisma.issueFact.count({ where: { issue: { matter_id: badMatterId } } })
    expect(linkCount).toBe(0)
    expect(await prisma.issue.count({ where: { matter_id: badMatterId } })).toBe(0)
    expect(await prisma.issueDraft.count({ where: { matter_id: badMatterId, OR: [{ published_issue_id: { not: null } }, { published_at: { not: null } }] } })).toBe(0)
    await cleanup(badMatterId)
    await cleanup(otherId)
  })

  it('does not create formal Issues during Intake Matter Create', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/intake/ai-create-matter',
      payload: {
        title: `Matter Create Issue Guard ${RUN_ID}`,
        client_name: '委托人',
        opponent_name: '对方',
        matter_type: '测试',
        case_summary: '用于确认 Matter Create 阶段不提前写入正式 Issues。',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.ai_created?.issues_count || 0).toBe(0)
    const issues = await prisma.issue.count({ where: { matter_id: body.matter_id } })
    expect(issues).toBe(0)
    await cleanup(body.matter_id)
  })

})
