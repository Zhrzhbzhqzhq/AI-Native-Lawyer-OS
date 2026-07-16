import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import buildApp from '../src/server'
import { createPrismaClient } from '@lawdesk/database'
import { assertFormalFactClean, buildFormalFactContent } from '../src/services/factDraftService'

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const matterId = `test-fact-draft-${RUN_ID}`
const otherMatterId = `test-fact-draft-other-${RUN_ID}`

let app: any
let prisma: any

async function cleanup(id: string) {
  await prisma.factEvidence.deleteMany({ where: { fact: { matter_id: id } } }).catch(() => {})
  await prisma.issueFact.deleteMany({ where: { fact: { matter_id: id } } }).catch(() => {})
  await prisma.factDraft.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.fact.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.evidence.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.material.deleteMany({ where: { matter_id: id } }).catch(() => {})
  await prisma.matter.deleteMany({ where: { matter_id: id } }).catch(() => {})
}

async function seedMatter(id: string, evidenceCount = 0) {
  await prisma.matter.create({ data: { matter_id: id, title: `Fact Draft ${id}`, description: '', matter_type: 'test', status: 'active' } })
  const materials = []
  for (let index = 0; index < Math.max(1, evidenceCount); index += 1) {
    const material = await prisma.material.create({
      data: {
        material_id: `mat-${id}-${index}`,
        matter_id: id,
        title: `材料 ${index + 1}`,
        material_type: 'text',
        source: 'client',
        storage_uri: '',
        status: 'active',
      },
    })
    materials.push(material)
  }
  for (let index = 0; index < evidenceCount; index += 1) {
    await prisma.evidence.create({
      data: {
        evidence_id: `ev-${id}-${index}`,
        matter_id: id,
        material_id: materials[index].material_id,
        title: ['借贷合意证据', '借款资金交付证据', '到期未还与催收证据'][index] || `证据 ${index + 1}`,
        evidence_type: 'confirmed',
        description: `证明目标：${['证明借贷合意', '证明资金交付', '证明到期未还'][index] || '证明案件事实'}\n摘要：正式 Evidence ${index + 1}`,
        relevance: '正式证据',
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

describe('Persisted Facts Draft Workflow', () => {
  it('keeps draft analysis fields separate while building clean formal facts', () => {
    const formal = buildFormalFactContent({
      title: '双方达成借款合意',
      description: '双方就借款事项达成合意，借条与聊天记录可以相互印证。',
    })

    expect(formal.title).toBe('双方达成借款合意')
    expect(formal.description).toContain('双方就借款事项达成合意')
    expect(() => assertFormalFactClean(formal.title, formal.description)).not.toThrow()
    expect(formal.description).not.toMatch(/来源材料ID|AI判断|可信度|mat-/)
  })

  it('rejects generation when no formal Evidence exists', async () => {
    const emptyMatterId = `${matterId}-empty`
    await cleanup(emptyMatterId)
    await seedMatter(emptyMatterId, 0)

    const res = await app.inject({ method: 'POST', url: `/matters/${emptyMatterId}/fact-drafts/generate` })

    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.body).error).toBe('formal_evidence_required')
    await cleanup(emptyMatterId)
  })

  it('generates persistent drafts idempotently from formal Evidence', async () => {
    await cleanup(matterId)
    await seedMatter(matterId, 3)

    const first = await app.inject({ method: 'POST', url: `/matters/${matterId}/fact-drafts/generate` })
    expect(first.statusCode).toBe(200)
    const firstBody = JSON.parse(first.body)
    expect(firstBody.idempotent).toBe(false)
    expect(firstBody.fact_drafts.length).toBe(3)
    expect(firstBody.fact_drafts.every((draft: any) => draft.review_status === 'pending')).toBe(true)
    expect(firstBody.fact_drafts.every((draft: any) => Array.isArray(draft.source_evidence_ids) && draft.source_evidence_ids.length > 0)).toBe(true)
    expect(firstBody.fact_drafts.some((draft: any) => typeof draft.confidence === 'number' || draft.ai_reasoning || Array.isArray(draft.source_evidence_ids))).toBe(true)

    const second = await app.inject({ method: 'POST', url: `/matters/${matterId}/fact-drafts/generate` })
    expect(second.statusCode).toBe(200)
    const secondBody = JSON.parse(second.body)
    expect(secondBody.idempotent).toBe(true)
    expect(secondBody.fact_drafts.map((draft: any) => draft.draft_id)).toEqual(firstBody.fact_drafts.map((draft: any) => draft.draft_id))

    const count = await prisma.factDraft.count({ where: { matter_id: matterId } })
    expect(count).toBe(3)
  })

  it('supports accepted, edited and ignored review states and blocks cross-matter updates', async () => {
    const drafts = await prisma.factDraft.findMany({ where: { matter_id: matterId }, orderBy: { created_at: 'asc' } })
    expect(drafts.length).toBe(3)

    const accept = await app.inject({
      method: 'PATCH',
      url: `/matters/${matterId}/fact-drafts/${drafts[0].draft_id}`,
      payload: { review_status: 'accepted' },
    })
    expect(accept.statusCode).toBe(200)
    expect(JSON.parse(accept.body).review_status).toBe('accepted')

    await cleanup(otherMatterId)
    await seedMatter(otherMatterId, 1)
    const cross = await app.inject({
      method: 'PATCH',
      url: `/matters/${otherMatterId}/fact-drafts/${drafts[0].draft_id}`,
      payload: { review_status: 'ignored' },
    })
    expect(cross.statusCode).toBe(403)

    const pendingPublish = await app.inject({ method: 'POST', url: `/matters/${matterId}/fact-drafts/publish` })
    expect(pendingPublish.statusCode).toBe(409)
    expect(await prisma.fact.count({ where: { matter_id: matterId } })).toBe(0)
    expect(await prisma.factEvidence.count({ where: { fact: { matter_id: matterId } } })).toBe(0)
    expect(await prisma.factDraft.count({ where: { matter_id: matterId, OR: [{ published_fact_id: { not: null } }, { published_at: { not: null } }] } })).toBe(0)

    const edit = await app.inject({
      method: 'PATCH',
      url: `/matters/${matterId}/fact-drafts/${drafts[1].draft_id}`,
      payload: { title: '经律师修改的资金交付事实', description: '银行流水与借条可相互印证资金交付。' },
    })
    expect(edit.statusCode).toBe(200)
    expect(JSON.parse(edit.body).review_status).toBe('edited')

    const editedPublish = await app.inject({ method: 'POST', url: `/matters/${matterId}/fact-drafts/publish` })
    expect(editedPublish.statusCode).toBe(409)
    expect(await prisma.fact.count({ where: { matter_id: matterId } })).toBe(0)
    expect(await prisma.factEvidence.count({ where: { fact: { matter_id: matterId } } })).toBe(0)
    expect(await prisma.factDraft.count({ where: { matter_id: matterId, OR: [{ published_fact_id: { not: null } }, { published_at: { not: null } }] } })).toBe(0)

    const acceptEdited = await app.inject({ method: 'PATCH', url: `/matters/${matterId}/fact-drafts/${drafts[1].draft_id}`, payload: { review_status: 'accepted' } })
    expect(acceptEdited.statusCode).toBe(200)
    expect(JSON.parse(acceptEdited.body).review_status).toBe('accepted')

    const ignore = await app.inject({
      method: 'PATCH',
      url: `/matters/${matterId}/fact-drafts/${drafts[2].draft_id}`,
      payload: { review_status: 'ignored' },
    })
    expect(ignore.statusCode).toBe(200)
    expect(JSON.parse(ignore.body).review_status).toBe('ignored')
  })

  it('publishes reviewed drafts to formal Facts and fact_evidence idempotently', async () => {
    const publish = await app.inject({ method: 'POST', url: `/matters/${matterId}/fact-drafts/publish` })
    expect(publish.statusCode).toBe(200)
    const body = JSON.parse(publish.body)
    expect(body.created_facts.length).toBe(2)
    expect(body.ignored_count).toBe(1)
    expect(body.links_count).toBeGreaterThan(0)

    const factCount = await prisma.fact.count({ where: { matter_id: matterId } })
    const linkCount = await prisma.factEvidence.count({ where: { fact: { matter_id: matterId } } })
    expect(factCount).toBe(2)
    expect(linkCount).toBeGreaterThan(0)

    const facts = await prisma.fact.findMany({ where: { matter_id: matterId }, orderBy: { created_at: 'asc' } })
    expect(facts.every((fact: any) => !/来源材料ID|来源材料：|AI判断|可信度|mat-|source_evidence_ids|confidence|ai_reasoning/.test(`${fact.title}\n${fact.description}`))).toBe(true)
    expect(facts.map((fact: any) => fact.title)).not.toContain('关于：借贷合意证据')
    expect(facts.map((fact: any) => fact.title)).not.toContain('关于：资金交付证据')

    const repeat = await app.inject({ method: 'POST', url: `/matters/${matterId}/fact-drafts/publish` })
    expect(repeat.statusCode).toBe(200)
    const repeatFactCount = await prisma.fact.count({ where: { matter_id: matterId } })
    expect(repeatFactCount).toBe(2)
  })

  it('rejects draft publish when formal fact content cannot be cleaned safely', async () => {
    const unsafeMatterId = `${matterId}-unsafe`
    await cleanup(unsafeMatterId)
    await seedMatter(unsafeMatterId, 1)
    const evidence = await prisma.evidence.findFirst({ where: { matter_id: unsafeMatterId } })
    await prisma.factDraft.create({ data: { draft_id: `fd-safe-${RUN_ID}`, matter_id: unsafeMatterId, title: '可发布事实', description: '该事实由案内证据支持。', source_evidence_ids: [evidence.evidence_id], review_status: 'accepted' } })
    await prisma.factDraft.create({
      data: {
        draft_id: `fd-unsafe-${RUN_ID}`,
        matter_id: unsafeMatterId,
        title: '污染事实',
        description: '来源材料ID：mat-danger\nAI判断：内部分析\n可信度：0.99',
        confidence: 0.99,
        ai_reasoning: '内部分析',
        source_evidence_ids: [evidence.evidence_id],
        review_status: 'accepted',
      },
    })

    const res = await app.inject({ method: 'POST', url: `/matters/${unsafeMatterId}/fact-drafts/publish` })
    expect(res.statusCode).toBe(422)
    expect(JSON.parse(res.body).error).toBe('unsafe_formal_fact_content')
    const factCount = await prisma.fact.count({ where: { matter_id: unsafeMatterId } })
    expect(factCount).toBe(0)
    expect(await prisma.factEvidence.count({ where: { fact: { matter_id: unsafeMatterId } } })).toBe(0)
    expect(await prisma.factDraft.count({ where: { matter_id: unsafeMatterId, OR: [{ published_fact_id: { not: null } }, { published_at: { not: null } }] } })).toBe(0)
    await cleanup(unsafeMatterId)
  })

  it('does not create formal Facts during Intake Matter Create', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/intake/ai-create-matter',
      payload: {
        title: `Matter Create Fact Guard ${RUN_ID}`,
        client_name: '委托人',
        opponent_name: '对方',
        matter_type: '测试',
        case_summary: '用于确认 Matter Create 阶段不提前写入正式 Facts。',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.ai_created?.facts_count || 0).toBe(0)
    const facts = await prisma.fact.count({ where: { matter_id: body.matter_id } })
    expect(facts).toBe(0)
    await cleanup(body.matter_id)
  })
})
