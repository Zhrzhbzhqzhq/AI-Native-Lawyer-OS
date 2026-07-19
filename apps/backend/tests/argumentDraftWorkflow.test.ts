import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import buildApp from '../src/server'
import { createPrismaClient } from '@lawdesk/database'
import { MockLlmAdapter } from '../src/ai/mockLlmAdapter'
import { assertFormalArgumentContent, normalizeArgumentSuggestionsForDrafts } from '../src/services/argumentDraftService'
import { validateArguments } from '../src/services/ai/AIOutputValidator'
import { FORMAL_ARGUMENT_V2_HEADER, parseFormalArgument } from '../src/services/formalSemanticCodec'

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
    const material = await prisma.material.create({
      data: {
        material_id: `material-${id}-${index}`,
        matter_id: id,
        title: `案件材料 ${index + 1}`,
        material_type: 'test',
        source: 'test',
        storage_uri: `test://${id}/${index}`,
        status: 'active',
      },
    })
    const evidence = await prisma.evidence.create({
      data: {
        evidence_id: `evidence-${id}-${index}`,
        matter_id: id,
        material_id: material.material_id,
        title: `正式证据 ${index + 1}`,
        evidence_type: 'document',
        description: '正式证据',
        relevance: '支持对应事实',
        status: 'active',
      },
    })
    const fact = await prisma.fact.create({
      data: {
        fact_id: `fact-${id}-${index}`,
        matter_id: id,
        title: ['借贷合意已形成', '借款资金已经交付', '债务到期后仍未清偿'][index] || `事实 ${index + 1}`,
        description: '正式事实',
        status: 'active',
      },
    })
    const issue = await prisma.issue.create({
      data: {
        issue_id: `issue-${id}-${index}`,
        matter_id: id,
        title: ['双方是否成立民间借贷关系', '出借人是否完成交付义务', '借款人是否构成违约'][index] || `争议焦点 ${index + 1}`,
        description: '正式争议焦点',
        status: 'active',
      },
    })
    const law = await prisma.law.create({
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
    await prisma.issueFact.create({ data: { issue_id: issue.issue_id, fact_id: fact.fact_id } })
    await prisma.factEvidence.create({ data: { fact_id: fact.fact_id, evidence_id: evidence.evidence_id, note: 'test-source' } })
    await prisma.lawIssue.create({ data: { law_id: law.law_id, issue_id: issue.issue_id } })
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
  const typedSources = {
    facts: [
      { fact_id: 'fact-agreement', issue_type: 'agreement' },
      { fact_id: 'fact-delivery', issue_type: 'delivery' },
      { fact_id: 'fact-default', issue_type: 'default' },
    ],
    issues: [
      { issue_id: 'issue-agreement', issue_type: 'agreement', source_fact_ids: ['fact-agreement'] },
      { issue_id: 'issue-delivery', issue_type: 'delivery', source_fact_ids: ['fact-delivery'] },
      { issue_id: 'issue-default', issue_type: 'default', source_fact_ids: ['fact-default'] },
    ],
    laws: [
      { law_id: 'law-agreement', issue_type: 'agreement', source_issue_ids: ['issue-agreement'] },
      { law_id: 'law-delivery', issue_type: 'delivery', source_issue_ids: ['issue-delivery'] },
      { law_id: 'law-default', issue_type: 'default', source_issue_ids: ['issue-default'] },
    ],
  }

  it('generates deterministic typed Arguments regardless of source order', async () => {
    const adapter = new MockLlmAdapter()
    const generate = async (facts: any[], issues: any[], laws: any[]) => (await adapter.generate({
      task: 'analyze_arguments',
      matter_id: 'generic-matter',
      prompt_version: 'argument-draft-v1',
      facts,
      issues,
      laws,
      context_pack: { matter: { title: '不参与 Argument 分类的案件标题' } },
    })).response.arguments
    const first = await generate(typedSources.facts, typedSources.issues, typedSources.laws)
    const second = await generate([...typedSources.facts].reverse(), [...typedSources.issues].reverse(), [...typedSources.laws].reverse())
    expect(second).toEqual(first)
    expect(first.map((argument: any) => argument.issue_type)).toEqual(['agreement', 'delivery', 'default'])
    expect(first.every((argument: any) => argument.source_fact_ids.length && argument.source_issue_ids.length && argument.source_law_ids.length)).toBe(true)
    expect(first[0].reasoning).toMatch(/民间借贷关系/)
    expect(first[0].reasoning).toMatch(/借条/)
    expect(first[0].reasoning).toMatch(/聊天记录/)
    expect(first[0].reasoning).toMatch(/借贷合意/)
    expect(first[0].conclusion).toMatch(/借贷关系成立|民间借贷关系成立/)
    expect(first[0].conclusion).toMatch(/律师.*最终审核/)
    expect(first[1].reasoning).toMatch(/银行流水/)
    expect(first[1].reasoning).toMatch(/转账/)
    expect(first[1].reasoning).toMatch(/资金交付/)
    expect(first[1].conclusion).toMatch(/出借义务.*履行/)
    expect(first[2].reasoning).toMatch(/到期/)
    expect(first[2].reasoning).toMatch(/未还款/)
    expect(first[2].reasoning).toMatch(/催收/)
    expect(first[2].reasoning).toMatch(/利息/)
    expect(first[2].conclusion).toMatch(/违约责任主张/)
    expect(first[2].risk_note).toMatch(/日期.*核验/)
    expect(first[2].risk_note).toMatch(/利息计算.*律师确认/)
    for (const argument of first) {
      expect(argument.risk_note).toMatch(/日期.*核验/)
      expect(argument.risk_note).toMatch(/利息计算.*确认/)
      expect(argument.risk_note).toMatch(/证据真实性.*审核/)
    }
  })

  it('keeps separate Arguments for separate Issues and never merges by issue type', () => {
    const facts = [{ fact_id: 'fact-a', title: '事实A' }, { fact_id: 'fact-b', title: '事实B' }]
    const issues = [
      { issue_id: 'issue-a', title: '争点A', facts: [{ fact: facts[0] }] },
      { issue_id: 'issue-b', title: '争点B', facts: [{ fact: facts[1] }] },
    ]
    const laws = [
      { law_id: 'law-a', citation: '法条A', issues: [{ issue_id: 'issue-a' }] },
      { law_id: 'law-b', citation: '法条B', issues: [{ issue_id: 'issue-b' }] },
    ]
    const content = {
      position: '基于当前来源形成阶段性观点。',
      reasoning: '事实与法律规则共同支持该阶段性观点。',
      counter_argument: '对方可能提出不同解释。',
      response: '应结合现有来源逐项回应。',
      risk: '事实与法律适用仍需律师审核。',
      conclusion: '现有来源可支持该项主张，仍需律师审核。',
    }
    const drafts = normalizeArgumentSuggestionsForDrafts([
      { ...content, title: '论证A', issue_title: '争点A', fact_titles: ['事实A'], law_citations: ['法条A'] },
      { ...content, title: '论证B', issue_title: '争点B', fact_titles: ['事实B'], law_citations: ['法条B'] },
    ], facts, issues, laws, new Set(['fact-a', 'fact-b']))
    expect(drafts).toHaveLength(2)
    expect(drafts.map((draft) => draft.source_issue_ids)).toEqual([['issue-a'], ['issue-b']])
  })

  it('rejects empty, invalid and type-mismatched source closures', () => {
    const facts = [
      { fact_id: 'fact-agreement', title: '双方形成借贷合意' },
      { fact_id: 'fact-delivery', title: '资金已经转账交付' },
    ]
    const issues = [
      { issue_id: 'issue-agreement', facts: [{ fact: facts[0] }] },
      { issue_id: 'issue-delivery', facts: [{ fact: facts[1] }] },
    ]
    const laws = [
      { law_id: 'law-agreement', issues: [{ issue_id: 'issue-agreement' }] },
      { law_id: 'law-delivery', issues: [{ issue_id: 'issue-delivery' }] },
    ]
    const base = {
      title: '成立论证',
      position: '阶段性观点',
      reasoning: '正式论证过程',
      counter_argument: '可能存在相反观点',
      response: '根据现有来源回应',
      risk: '仍需律师审核',
      conclusion: '现有来源支持该阶段性观点，仍需律师审核',
    }
    const backed = new Set(['fact-agreement', 'fact-delivery'])
    expect(normalizeArgumentSuggestionsForDrafts([{ ...base, source_fact_ids: [], source_issue_ids: ['issue-agreement'], source_law_ids: ['law-agreement'] }], facts, issues, laws, backed)).toEqual([])
    expect(normalizeArgumentSuggestionsForDrafts([{ ...base, source_fact_ids: ['missing'], source_issue_ids: ['issue-agreement'], source_law_ids: ['law-agreement'] }], facts, issues, laws, backed)).toEqual([])
    expect(normalizeArgumentSuggestionsForDrafts([{ ...base, source_fact_ids: ['fact-agreement'], source_issue_ids: ['issue-delivery'], source_law_ids: ['law-delivery'] }], facts, issues, laws, backed)).toEqual([])
    expect(normalizeArgumentSuggestionsForDrafts([{ ...base, source_fact_ids: ['fact-agreement'], source_issue_ids: ['issue-agreement'], source_law_ids: ['law-agreement'] }], facts, issues, laws, backed)).toHaveLength(1)
    expect(normalizeArgumentSuggestionsForDrafts([{ ...base, source_fact_ids: ['fact-agreement'], source_issue_ids: ['issue-agreement', 'issue-delivery'], source_law_ids: ['law-agreement'] }], facts, issues, laws, backed)).toEqual([])
    expect(normalizeArgumentSuggestionsForDrafts([{ ...base, source_fact_ids: ['fact-agreement'], source_issue_ids: ['issue-agreement'], source_law_ids: ['law-agreement'] }], facts, issues, laws, new Set())).toEqual([])
  })

  it('allows provisional positions and rejects final outcome guarantees', () => {
    const safe = {
      title: '阶段性法律论证',
      issue_title: '争议焦点',
      fact_titles: ['已确认事实'],
      law_citations: ['《测试法》第一条'],
      position: '基于当前来源，可以提出该项法律主张。',
      reasoning: '已确认事实与适用规则共同构成现阶段论证基础。',
      counter_argument: '对方可能提出不同解释。',
      response: '应结合现有证据逐项回应。',
      risk: '事实认定和法律适用仍需律师审核。',
      conclusion: '现有来源可支持该阶段性观点，仍需律师审核。',
    }
    expect(validateArguments([safe]).ok).toBe(true)
    expect(validateArguments([{ ...safe, conclusion: '本案必然胜诉，法院一定支持全部诉讼请求。' }]).ok).toBe(false)
    expect(() => assertFormalArgumentContent({ ...safe, conclusion: '对方毫无疑问应承担全部责任。' })).toThrow('unsafe_argument_boundary')
  })

  it('rejects internal metadata and placeholder content', () => {
    for (const unsafe of ['Prompt', 'ai_reasoning', 'source_fact_ids', '第X条', 'placeholder']) {
      expect(() => assertFormalArgumentContent({ title: '正式论证', reasoning: `论证包含 ${unsafe}`, conclusion: '正式结论' })).toThrow()
    }
  })

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
    expect(firstBody.ai_audit).toEqual({ provider: 'mock', model: 'mock-lawdesk-v1', prompt_version: 'argument-draft-v1', fallback_used: false })
    expect(firstBody.argument_drafts.length).toBe(3)
    expect(firstBody.argument_drafts.every((draft: any) => draft.review_status === 'pending')).toBe(true)
    expect(firstBody.argument_drafts.every((draft: any) => Array.isArray(draft.source_fact_ids) && draft.source_fact_ids.length > 0)).toBe(true)
    expect(firstBody.argument_drafts.every((draft: any) => Array.isArray(draft.source_issue_ids) && draft.source_issue_ids.length > 0)).toBe(true)
    expect(firstBody.argument_drafts.every((draft: any) => Array.isArray(draft.source_law_ids) && draft.source_law_ids.length > 0)).toBe(true)

    const second = await app.inject({ method: 'POST', url: `/matters/${matterId}/argument-drafts/generate`, payload: {} })
    expect(second.statusCode).toBe(200)
    const secondBody = JSON.parse(second.body)
    expect(secondBody.idempotent).toBe(true)
    expect(secondBody.ai_audit).toBeNull()
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
    const formalArgument = await prisma.argument.findUnique({ where: { argument_id: published.published_argument_id } })
    expect(formalArgument.description.startsWith(`${FORMAL_ARGUMENT_V2_HEADER}\n`)).toBe(true)
    expect(parseFormalArgument(formalArgument.description)).toMatchObject({
      encoding: 'valid-v2',
      parsed: true,
      fields: {
        position: published.position || '',
        reasoning: published.reasoning || '',
        counter_argument: published.counter_argument || '',
        response: published.response || '',
        risk: published.risk || '',
      },
    })
    expect(JSON.stringify(body.created_arguments)).not.toContain(FORMAL_ARGUMENT_V2_HEADER)
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

  it('rejects locally valid source IDs when a reviewed draft is changed to cross Issue boundaries', async () => {
    const badMatterId = `${matterId}-cross-issue-source`
    await cleanup(badMatterId)
    await seedMatter(badMatterId, 2)
    const facts = await prisma.fact.findMany({ where: { matter_id: badMatterId }, orderBy: { created_at: 'asc' } })
    const issues = await prisma.issue.findMany({ where: { matter_id: badMatterId }, orderBy: { created_at: 'asc' } })
    const laws = await prisma.law.findMany({ where: { matter_id: badMatterId }, orderBy: { created_at: 'asc' } })
    await prisma.argumentDraft.create({
      data: {
        matter_id: badMatterId,
        title: '被篡改来源的阶段性论证',
        position: '基于现有来源形成阶段性观点。',
        reasoning: '事实与法律共同构成当前论证基础。',
        counter_argument: '对方可能提出不同解释。',
        response: '应结合现有来源逐项回应。',
        risk: '事实与法律适用仍需律师审核。',
        conclusion: '当前仅形成阶段性观点，仍待律师审核。',
        source_fact_ids: JSON.stringify([facts[1].fact_id]),
        source_issue_ids: JSON.stringify([issues[0].issue_id]),
        source_law_ids: JSON.stringify([laws[0].law_id]),
        review_status: 'accepted',
      },
    })

    const publish = await app.inject({ method: 'POST', url: `/matters/${badMatterId}/argument-drafts/publish`, payload: {} })
    expect(publish.statusCode).toBe(400)
    expect(JSON.parse(publish.body).error).toBe('invalid_source_issue_ids')
    expect(await prisma.argument.count({ where: { matter_id: badMatterId } })).toBe(0)
    await cleanup(badMatterId)
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
