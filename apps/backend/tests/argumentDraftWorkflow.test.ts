import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import buildApp from '../src/server'
import { createPrismaClient } from '@lawdesk/database'

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const matterId = `test-argument-draft-${RUN_ID}`
const otherMatterId = `test-argument-draft-other-${RUN_ID}`

let app: any
let prisma: any

async function cleanup(id: string) {
  await prisma.argumentFact.deleteMany({ where: { OR: [{ argument: { matter_id: id } }, { fact: { matter_id: id } }] } }).catch(() => {})
  await prisma.argumentIssue.deleteMany({ where: { OR: [{ argument: { matter_id: id } }, { issue: { matter_id: id } }] } }).catch(() => {})
  await prisma.argumentLaw.deleteMany({ where: { OR: [{ argument: { matter_id: id } }, { law: { matter_id: id } }] } }).catch(() => {})
  await prisma.argumentDraft.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.argument.deleteMany({ where: { matter_id: id } }).catch(() => {})
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

async function seedMatter(id: string, count = 0) {
  await prisma.matter.create({ data: { matter_id: id, title: `Argument Draft ${id}`, description: '', matter_type: 'test', status: 'active' } })
  for (let index = 0; index < count; index += 1) {
    await prisma.fact.create({
      data: {
        fact_id: `fact-${id}-${index}`,
        matter_id: id,
        title: ['借贷合意已形成', '借款资金已经交付', '债务到期后仍未清偿'][index] || `事实 ${index + 1}`,
        description: '正式事实',
        status: 'active',
      },
    })
    await prisma.issue.create({
      data: {
        issue_id: `issue-${id}-${index}`,
        matter_id: id,
        title: ['双方是否成立民间借贷关系', '出借人是否完成交付义务', '借款人是否构成违约'][index] || `争议焦点 ${index + 1}`,
        description: '正式争议焦点',
        status: 'active',
      },
    })
    await prisma.law.create({
      data: {
        law_id: `law-${id}-${index}`,
        matter_id: id,
        issue_id: `issue-${id}-${index}`,
        title: ['民间借贷合同成立规则', '借款交付证明规则', '到期履行与违约责任规则'][index] || `法律依据 ${index + 1}`,
        citation: ['民法典第六百六十七条', '民法典第六百七十九条', '民法典第五百七十七条'][index] || '测试法条',
        description: '正式法律依据',
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

describe('Persisted Argument Draft Workflow', () => {
  it('rejects generation when no formal Laws exist', async () => {
    const emptyMatterId = `${matterId}-empty`
    await cleanup(emptyMatterId)
    await seedMatter(emptyMatterId, 0)

    const res = await app.inject({ method: 'POST', url: `/matters/${emptyMatterId}/argument-drafts/generate`, payload: {} })

    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.body).error).toBe('formal_laws_required')
    await cleanup(emptyMatterId)
  })

  it('generates persistent argument drafts idempotently from formal Facts, Issues and Laws', async () => {
    await cleanup(matterId)
    await seedMatter(matterId, 3)

    const first = await app.inject({ method: 'POST', url: `/matters/${matterId}/argument-drafts/generate`, payload: {} })
    expect(first.statusCode).toBe(200)
    const firstBody = JSON.parse(first.body)
    expect(firstBody.idempotent).toBe(false)
    expect(firstBody.argument_drafts.length).toBe(3)
    expect(firstBody.argument_drafts.every((draft: any) => draft.review_status === 'pending')).toBe(true)
    expect(firstBody.argument_drafts.every((draft: any) => Array.isArray(draft.source_fact_ids) && draft.source_fact_ids.length > 0)).toBe(true)
    expect(firstBody.argument_drafts.every((draft: any) => Array.isArray(draft.source_issue_ids) && draft.source_issue_ids.length > 0)).toBe(true)
    expect(firstBody.argument_drafts.every((draft: any) => Array.isArray(draft.source_law_ids) && draft.source_law_ids.length > 0)).toBe(true)

    const second = await app.inject({ method: 'POST', url: `/matters/${matterId}/argument-drafts/generate`, payload: {} })
    expect(second.statusCode).toBe(200)
    const secondBody = JSON.parse(second.body)
    expect(secondBody.idempotent).toBe(true)
    expect(secondBody.argument_drafts.map((draft: any) => draft.id)).toEqual(firstBody.argument_drafts.map((draft: any) => draft.id))

    const count = await prisma.argumentDraft.count({ where: { matter_id: matterId } })
    expect(count).toBe(3)
  })

  it('supports accepted, edited and ignored states and blocks cross-matter updates', async () => {
    const drafts = await prisma.argumentDraft.findMany({ where: { matter_id: matterId }, orderBy: { created_at: 'asc' } })
    expect(drafts.length).toBe(3)

    const accept = await app.inject({ method: 'PATCH', url: `/matters/${matterId}/argument-drafts/${drafts[0].id}`, payload: { review_status: 'accepted' } })
    expect(accept.statusCode).toBe(200)
    expect(JSON.parse(accept.body).review_status).toBe('accepted')

    await cleanup(otherMatterId)
    await seedMatter(otherMatterId, 1)
    const cross = await app.inject({ method: 'PATCH', url: `/matters/${otherMatterId}/argument-drafts/${drafts[0].id}`, payload: { review_status: 'ignored' } })
    expect(cross.statusCode).toBe(403)

    const pendingPublish = await app.inject({ method: 'POST', url: `/matters/${matterId}/argument-drafts/publish`, payload: {} })
    expect(pendingPublish.statusCode).toBe(409)
    expect(await prisma.argument.count({ where: { matter_id: matterId } })).toBe(0)
    expect(await prisma.argumentFact.count({ where: { argument: { matter_id: matterId } } })).toBe(0)
    expect(await prisma.argumentIssue.count({ where: { argument: { matter_id: matterId } } })).toBe(0)
    expect(await prisma.argumentLaw.count({ where: { argument: { matter_id: matterId } } })).toBe(0)
    expect(await prisma.argumentDraft.count({ where: { matter_id: matterId, OR: [{ published_argument_id: { not: null } }, { published_at: { not: null } }] } })).toBe(0)

    const edit = await app.inject({ method: 'PATCH', url: `/matters/${matterId}/argument-drafts/${drafts[1].id}`, payload: { title: '经律师修改的还款责任论证', reasoning: '借条、交付和催收事实共同支撑请求权。' } })
    expect(edit.statusCode).toBe(200)
    expect(JSON.parse(edit.body).review_status).toBe('edited')
    const editedPublish = await app.inject({ method: 'POST', url: `/matters/${matterId}/argument-drafts/publish`, payload: {} })
    expect(editedPublish.statusCode).toBe(409)
    expect(await prisma.argument.count({ where: { matter_id: matterId } })).toBe(0)
    expect(await prisma.argumentDraft.count({ where: { matter_id: matterId, OR: [{ published_argument_id: { not: null } }, { published_at: { not: null } }] } })).toBe(0)
    const acceptEdited = await app.inject({ method: 'PATCH', url: `/matters/${matterId}/argument-drafts/${drafts[1].id}`, payload: { review_status: 'accepted' } })
    expect(acceptEdited.statusCode).toBe(200)
    expect(JSON.parse(acceptEdited.body).review_status).toBe('accepted')

    const ignore = await app.inject({ method: 'PATCH', url: `/matters/${matterId}/argument-drafts/${drafts[2].id}`, payload: { review_status: 'ignored' } })
    expect(ignore.statusCode).toBe(200)
    expect(JSON.parse(ignore.body).review_status).toBe('ignored')
  })

  it('publishes reviewed drafts to formal Arguments and all source links idempotently', async () => {
    const publish = await app.inject({ method: 'POST', url: `/matters/${matterId}/argument-drafts/publish`, payload: {} })
    expect(publish.statusCode).toBe(200)
    const body = JSON.parse(publish.body)
    expect(body.created_arguments.length).toBe(2)
    expect(body.ignored_count).toBe(1)
    expect(body.argument_fact_links).toBeGreaterThan(0)
    expect(body.argument_issue_links).toBeGreaterThan(0)
    expect(body.argument_law_links).toBeGreaterThan(0)

    const argumentCount = await prisma.argument.count({ where: { matter_id: matterId } })
    const factLinks = await prisma.argumentFact.count({ where: { argument: { matter_id: matterId } } })
    const issueLinks = await prisma.argumentIssue.count({ where: { argument: { matter_id: matterId } } })
    const lawLinks = await prisma.argumentLaw.count({ where: { argument: { matter_id: matterId } } })
    expect(argumentCount).toBe(2)
    expect(factLinks).toBeGreaterThan(0)
    expect(issueLinks).toBeGreaterThan(0)
    expect(lawLinks).toBeGreaterThan(0)

    const published = await prisma.argumentDraft.findFirst({ where: { matter_id: matterId, published_argument_id: { not: null } } })
    expect(published).toBeTruthy()
    const modifyPublished = await app.inject({ method: 'PATCH', url: `/matters/${matterId}/argument-drafts/${published.id}`, payload: { review_status: 'ignored' } })
    expect(modifyPublished.statusCode).toBe(409)

    const repeat = await app.inject({ method: 'POST', url: `/matters/${matterId}/argument-drafts/publish`, payload: {} })
    expect(repeat.statusCode).toBe(200)
    expect(await prisma.argument.count({ where: { matter_id: matterId } })).toBe(argumentCount)
    expect(await prisma.argumentFact.count({ where: { argument: { matter_id: matterId } } })).toBe(factLinks)
    expect(await prisma.argumentIssue.count({ where: { argument: { matter_id: matterId } } })).toBe(issueLinks)
    expect(await prisma.argumentLaw.count({ where: { argument: { matter_id: matterId } } })).toBe(lawLinks)
  })

  it('rejects draft sources that do not belong to the matter during publish', async () => {
    const badMatterId = `${matterId}-bad-source`
    const otherId = `${matterId}-source-other`
    await cleanup(badMatterId)
    await cleanup(otherId)
    await seedMatter(badMatterId, 1)
    await seedMatter(otherId, 1)
    const otherFact = await prisma.fact.findFirst({ where: { matter_id: otherId } })
    const localFact = await prisma.fact.findFirst({ where: { matter_id: badMatterId } })
    const badIssue = await prisma.issue.findFirst({ where: { matter_id: badMatterId } })
    const badLaw = await prisma.law.findFirst({ where: { matter_id: badMatterId } })
    await prisma.argumentDraft.create({ data: { matter_id: badMatterId, title: '案内法律论证', position: '支持请求', reasoning: '案内事实与法律共同支持请求。', conclusion: '应支持请求。', source_fact_ids: [localFact.fact_id], source_issue_ids: [badIssue.issue_id], source_law_ids: [badLaw.law_id], review_status: 'accepted' } })
    await prisma.argumentDraft.create({
      data: {
        matter_id: badMatterId,
        title: '跨案件事实不应写入关联',
        position: '测试',
        reasoning: '测试',
        conclusion: '测试',
        source_fact_ids: [otherFact.fact_id],
        source_issue_ids: [badIssue.issue_id],
        source_law_ids: [badLaw.law_id],
        review_status: 'accepted',
      },
    })

    const publish = await app.inject({ method: 'POST', url: `/matters/${badMatterId}/argument-drafts/publish`, payload: {} })
    expect(publish.statusCode).toBe(400)
    expect(JSON.parse(publish.body).error).toBe('invalid_source_fact_ids')
    expect(await prisma.argument.count({ where: { matter_id: badMatterId } })).toBe(0)
    expect(await prisma.argumentFact.count({ where: { argument: { matter_id: badMatterId } } })).toBe(0)
    expect(await prisma.argumentIssue.count({ where: { argument: { matter_id: badMatterId } } })).toBe(0)
    expect(await prisma.argumentLaw.count({ where: { argument: { matter_id: badMatterId } } })).toBe(0)
    expect(await prisma.argumentDraft.count({ where: { matter_id: badMatterId, OR: [{ published_argument_id: { not: null } }, { published_at: { not: null } }] } })).toBe(0)
    await cleanup(badMatterId)
    await cleanup(otherId)
  })

  it('does not create formal Arguments during Intake Matter Create', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/intake/ai-create-matter',
      payload: {
        title: `Matter Create Argument Guard ${RUN_ID}`,
        client_name: '委托人',
        opponent_name: '对方',
        matter_type: '测试',
        case_summary: '用于确认 Matter Create 阶段不提前写入正式 Arguments。',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.ai_created?.arguments_count || 0).toBe(0)
    expect(await prisma.argument.count({ where: { matter_id: body.matter_id } })).toBe(0)
    await cleanup(body.matter_id)
  })
})
