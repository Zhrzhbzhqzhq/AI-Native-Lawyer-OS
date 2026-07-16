import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import buildApp from '../src/server'
import { createPrismaClient } from '@lawdesk/database'

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
    await prisma.issue.create({
      data: {
        issue_id: `issue-${id}-${index}`,
        matter_id: id,
        title: ['双方是否成立民间借贷法律关系', '出借人是否已经完成借款交付义务', '借款人是否构成到期未还的违约'][index] || `争议焦点 ${index + 1}`,
        description: ['需要判断借贷合意与合同成立。', '需要判断资金是否实际交付。', '需要判断到期未还是否构成违约。'][index] || '正式争议焦点',
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

describe('Persisted Laws Draft Workflow', () => {
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
    expect(firstBody.law_drafts.length).toBe(3)
    expect(firstBody.law_drafts.every((draft: any) => draft.review_status === 'pending')).toBe(true)
    expect(firstBody.law_drafts.every((draft: any) => Array.isArray(draft.source_issue_ids) && draft.source_issue_ids.length > 0)).toBe(true)
    expect(firstBody.law_drafts.every((draft: any) => draft.rule_content && draft.application && draft.limitations)).toBe(true)

    const second = await app.inject({ method: 'POST', url: `/matters/${matterId}/law-drafts/generate`, payload: {} })
    expect(second.statusCode).toBe(200)
    const secondBody = JSON.parse(second.body)
    expect(secondBody.idempotent).toBe(true)
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
