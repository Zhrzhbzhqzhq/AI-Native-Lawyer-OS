import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fetch from 'node-fetch'

let app: any
let BASE = ''
let prisma: any

function requireRcTestDatabase() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL_required_for_rc_tests')
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, '')
  if (databaseName !== 'lawdesk_rc_test') throw new Error(`unsafe_test_database:${databaseName}`)
}

beforeAll(async () => {
  requireRcTestDatabase()
  const { createPrismaClient } = await import('@lawdesk/database')
  const { default: buildApp } = await import('../src/server')
  prisma = createPrismaClient()

  app = await buildApp()
  await app.listen({ port: 0 })
  const addr: any = app.server.address()
  const port = addr && addr.port ? addr.port : 4000
  BASE = `http://127.0.0.1:${port}`
})

afterAll(async () => {
  if (app) await app.close()
  if (prisma) await prisma.$disconnect()
})

describe('Unified Intake API', () => {
  it('returns mock intake result and does not create legal objects', async () => {
    const markerMatterId = `mock-intake-${Date.now()}`
    const beforeEvidence = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM evidence WHERE matter_id = ${markerMatterId}
    `
    const beforeDocument = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    const beforeKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const beforeMaterials = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM materials WHERE matter_id = ${markerMatterId}
    `
    const beforeTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `

    const res = await fetch(`${BASE}/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: [
          { name: 'a.pdf', size: 1234, type: 'application/pdf' },
          { name: 'b.m4a', size: 2345, type: 'audio/mp4' },
        ],
        matter_id: markerMatterId,
        source: 'Plaintiff',
      }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { job_id: string; status: string; suggestions: unknown[] }
    expect(typeof body.job_id).toBe('string')
    expect(body.job_id.length).toBeGreaterThan(0)
    expect(body.status).toBe('analysis_ready')
    expect(body.analysis).toBeDefined()
    expect(typeof body.analysis.summary).toBe('string')
    expect(Array.isArray(body.analysis.evidence_suggestions)).toBe(true)
    expect(Array.isArray(body.analysis.document_suggestions)).toBe(true)

    const afterEvidence = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM evidence WHERE matter_id = ${markerMatterId}
    `
    const afterDocument = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    const afterKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const afterMaterials = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM materials WHERE matter_id = ${markerMatterId}
    `
    const afterTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `

    expect(afterEvidence[0].count).toBe(beforeEvidence[0].count)
    expect(afterDocument[0].count).toBe(beforeDocument[0].count)
    expect(afterKnowledge[0].count).toBe(beforeKnowledge[0].count)
    expect(afterMaterials[0].count).toBe(beforeMaterials[0].count)
    expect(afterTimeline[0].count).toBe(beforeTimeline[0].count)
  })

  it('confirm-material creates materials and does not create other objects', async () => {
    const markerMatterId = `mock-intake-${Date.now()}-confirm`

    const beforeMaterials = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM materials WHERE matter_id = ${markerMatterId}
    `
    const beforeEvidence = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM evidence WHERE matter_id = ${markerMatterId}
    `
    const beforeDocument = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    const beforeKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const beforeTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `

    // first get an analysis
    const res = await fetch(`${BASE}/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: [{ name: 'x.pdf', size: 10, type: 'application/pdf' }], matter_id: markerMatterId, source: 'Plaintiff' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.analysis).toBeDefined()

    // create matter fixture required for confirm-material
    await prisma.matter.create({ data: { matter_id: markerMatterId, title: 'Confirm Material Matter', description: 'fixture', matter_type: 'test', status: 'active' } })

    // now confirm material
    const confirmRes = await fetch(`${BASE}/intake/confirm-material`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matter_id: markerMatterId,
        source: 'client',
        files: [{ name: 'x.pdf', mime_type: 'application/pdf' }],
        analysis: { summary: body.analysis.summary, material_suggestions: [] },
      }),
    })
    expect(confirmRes.status).toBe(200)
    const confirmBody = await confirmRes.json()
    expect(confirmBody.status).toBe('material_created')
    expect(Array.isArray(confirmBody.created_materials)).toBe(true)
    expect(confirmBody.created_materials.length).toBe(1)
    expect(confirmBody.created_materials[0].matter_id).toBe(markerMatterId)
    expect(confirmBody.created_materials[0].storage_uri).toBe('')

    const afterMaterials = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM materials WHERE matter_id = ${markerMatterId}
    `
    const afterEvidence = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM evidence WHERE matter_id = ${markerMatterId}
    `
    const afterDocument = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    const afterKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const afterTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `

    expect(Number(afterMaterials[0].count - beforeMaterials[0].count)).toBe(1)
    expect(afterEvidence[0].count).toBe(beforeEvidence[0].count)
    expect(afterDocument[0].count).toBe(beforeDocument[0].count)
    expect(afterKnowledge[0].count).toBe(beforeKnowledge[0].count)
    expect(afterTimeline[0].count).toBe(beforeTimeline[0].count)
  })

  it('confirm-material saves a validated upload storage_uri', async () => {
    const markerMatterId = `mock-intake-${Date.now()}-storage-uri`
    const storageUri = 'storage/intake-uploads/fixture.docx'
    await prisma.matter.create({
      data: { matter_id: markerMatterId, title: 'Storage URI Matter', description: 'fixture', matter_type: 'test', status: 'active' },
    })

    const response = await fetch(`${BASE}/intake/confirm-material`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matter_id: markerMatterId,
        source: 'client',
        files: [{ name: 'fixture.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', storage_uri: storageUri }],
      }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.created_materials).toHaveLength(1)
    expect(body.created_materials[0].storage_uri).toBe(storageUri)
    const stored = await prisma.material.findFirst({ where: { matter_id: markerMatterId } })
    expect(stored?.storage_uri).toBe(storageUri)
  })

  it.each([
    '../outside.docx',
    '/tmp/outside.docx',
    'storage/other/outside.docx',
    'storage/intake-uploads/../outside.docx',
  ])('confirm-material rejects invalid storage_uri %s', async (storageUri) => {
    const response = await fetch(`${BASE}/intake/confirm-material`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matter_id: `mock-intake-${Date.now()}-invalid-storage`,
        source: 'client',
        files: [{ name: 'outside.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', storage_uri: storageUri }],
      }),
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'invalid storage_uri' })
  })

  it('evidence-draft returns drafts and does not create formal evidence', async () => {
    const markerMatterId = `mock-intake-${Date.now()}-draft`

    // create matter fixture
    await prisma.matter.create({ data: { matter_id: markerMatterId, title: 'Draft Matter', description: '', matter_type: 'test', status: 'active' } })

    const beforeEvidence = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM evidence WHERE matter_id = ${markerMatterId}
    `
    const beforeDocument = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    const beforeKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const beforeTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `

    const materials = [{ material_id: `mat-${Date.now()}`, title: '借条.pdf', material_type: 'document', source: 'client', content: '借条载明借款金额、借款人、出借人和还款期限。' }]

    const res = await fetch(`${BASE}/intake/evidence-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matter_id: markerMatterId, materials }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('evidence_draft_ready')
    expect(Array.isArray(body.evidence_drafts)).toBe(true)
    expect(body.evidence_drafts[0].material_id).toBe(materials[0].material_id)

    const afterEvidence = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM evidence WHERE matter_id = ${markerMatterId}
    `
    const afterDocument = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    const afterKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const afterTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `

    expect(afterEvidence[0].count).toBe(beforeEvidence[0].count)
    expect(afterDocument[0].count).toBe(beforeDocument[0].count)
    expect(afterKnowledge[0].count).toBe(beforeKnowledge[0].count)
    expect(afterTimeline[0].count).toBe(beforeTimeline[0].count)
  })

  it('confirm-evidence creates formal evidence from drafts', async () => {
    const markerMatterId = `mock-intake-${Date.now()}-ev`

    // create matter fixture
    await prisma.matter.create({ data: { matter_id: markerMatterId, title: 'EV Matter', description: '', matter_type: 'test', status: 'active' } })

    // create material fixture
    const material = await prisma.material.create({ data: { material_id: `mat-${Date.now()}`, matter_id: markerMatterId, title: '借条.pdf', material_type: 'document', source: 'client', storage_uri: '', status: 'active' } })

    // generate drafts using the API
    const draftRes = await fetch(`${BASE}/intake/evidence-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matter_id: markerMatterId, materials: [{ material_id: material.material_id, title: material.title, material_type: material.material_type, source: 'client', content: '借条载明借款金额、借款人、出借人和还款期限。' }] }),
    })
    expect(draftRes.status).toBe(200)
    const draftBody = await draftRes.json()
    expect(Array.isArray(draftBody.evidence_drafts)).toBe(true)

    const beforeEvidence = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM evidence WHERE matter_id = ${markerMatterId}
    `
    const beforeDocument = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    const beforeKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const beforeTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `

    // confirm evidence
    const confirmRes = await fetch(`${BASE}/intake/confirm-evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matter_id: markerMatterId, evidence_drafts: draftBody.evidence_drafts }),
    })
    expect(confirmRes.status).toBe(200)
    const confirmBody = await confirmRes.json()
    expect(confirmBody.status).toBe('evidence_created')
    expect(Array.isArray(confirmBody.created_evidence)).toBe(true)
    expect(confirmBody.created_evidence.length).toBe(draftBody.evidence_drafts.length)
    expect(confirmBody.created_evidence[0].matter_id).toBe(markerMatterId)
    expect(confirmBody.created_evidence[0].material_id).toBe(material.material_id)

    const afterEvidence = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM evidence WHERE matter_id = ${markerMatterId}
    `
    const afterDocument = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    const afterKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const afterTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `

    expect(Number(afterEvidence[0].count - beforeEvidence[0].count)).toBe(draftBody.evidence_drafts.length)
    expect(afterDocument[0].count).toBe(beforeDocument[0].count)
    expect(afterKnowledge[0].count).toBe(beforeKnowledge[0].count)
    expect(afterTimeline[0].count).toBe(beforeTimeline[0].count)
  })

  it('confirm-evidence publishes aggregate draft fields without regenerating evidence', async () => {
    const markerMatterId = `mock-intake-${Date.now()}-publish`

    await prisma.matter.create({ data: { matter_id: markerMatterId, title: 'Publish Matter', description: '', matter_type: 'test', status: 'active' } })
    const materialIds = [`mat-${Date.now()}-1`, `mat-${Date.now()}-2`, `mat-${Date.now()}-3`]
    await prisma.material.createMany({
      data: [
        { material_id: materialIds[0], matter_id: markerMatterId, title: '001_客户咨询记录.md', material_type: 'markdown', source: 'client', storage_uri: '', status: 'active' },
        { material_id: materialIds[1], matter_id: markerMatterId, title: '003_微信聊天_借款形成.md', material_type: 'markdown', source: 'client', storage_uri: '', status: 'active' },
        { material_id: materialIds[2], matter_id: markerMatterId, title: '005_借条.md', material_type: 'markdown', source: 'client', storage_uri: '', status: 'active' },
      ],
    })

    const draft = {
      draft_id: 'draft-agreement',
      material_id: materialIds[0],
      source_material_ids: materialIds,
      materials: [
        { material_id: materialIds[0], title: '001_客户咨询记录.md' },
        { material_id: materialIds[1], title: '003_微信聊天_借款形成.md' },
        { material_id: materialIds[2], title: '005_借条.md' },
      ],
      title: '借贷合意证据',
      evidence_type: 'document',
      proof_purpose: '证明双方达成民间借贷合意',
      description: '借条、聊天与咨询记录共同指向借款合意。',
      relevance: '证明双方达成民间借贷合意',
      summary: '借条、聊天与咨询记录共同指向借款合意。',
      reasoning: '多份材料可相互印证借款关系成立。',
      confidence: 0.95,
      source: 'client',
    }

    const confirmRes = await fetch(`${BASE}/intake/confirm-evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matter_id: markerMatterId, evidence_drafts: [draft] }),
    })

    expect(confirmRes.status).toBe(200)
    const confirmBody = await confirmRes.json()
    expect(confirmBody.created_evidence).toHaveLength(1)
    const created = confirmBody.created_evidence[0]
    expect(created.title).toBe('借贷合意证据')
    expect(created.relevance).toBe('证明双方达成民间借贷合意')
    expect(created.description).toContain('摘要：借条、聊天与咨询记录共同指向借款合意。')
    expect(created.description).toContain('证明目标：证明双方达成民间借贷合意')
    expect(created.description).toContain('AI判断理由：多份材料可相互印证借款关系成立。')
    expect(created.description).toContain('可信度：0.95')
    expect(created.description).toContain(`来源材料ID：${materialIds.join(', ')}`)
    expect(created.description).toContain('来源材料：001_客户咨询记录.md、003_微信聊天_借款形成.md、005_借条.md')
    expect(created.title).not.toBe('008_律师函.md')
    expect(created.relevance).not.toBe('Support claim')
    expect(created.description).not.toContain('Support claim')
  })

  it('confirm-evidence publishes every draft without overwriting prior evidence', async () => {
    const markerMatterId = `mock-intake-${Date.now()}-batch`

    await prisma.matter.create({ data: { matter_id: markerMatterId, title: 'Batch Publish Matter', description: '', matter_type: 'test', status: 'active' } })
    const materialIds = [`mat-${Date.now()}-a`, `mat-${Date.now()}-b`, `mat-${Date.now()}-c`]
    await prisma.material.createMany({
      data: materialIds.map((material_id, index) => ({
        material_id,
        matter_id: markerMatterId,
        title: `材料 ${index + 1}.md`,
        material_type: 'markdown',
        source: 'client',
        storage_uri: '',
        status: 'active',
      })),
    })

    const drafts = [
      { draft_id: 'draft-1', material_id: materialIds[0], source_material_ids: [materialIds[0], materialIds[1]], materials: [{ material_id: materialIds[0], title: '材料 1.md' }, { material_id: materialIds[1], title: '材料 2.md' }], title: '借贷合意证据', evidence_type: 'document', proof_purpose: '证明双方达成民间借贷合意', summary: '合意摘要', reasoning: '合意理由', confidence: 0.95 },
      { draft_id: 'draft-2', material_id: materialIds[1], source_material_ids: [materialIds[1]], materials: [{ material_id: materialIds[1], title: '材料 2.md' }], title: '借款资金交付证据', evidence_type: 'document', proof_purpose: '证明资金已经实际交付', summary: '交付摘要', reasoning: '交付理由', confidence: 0.92 },
      { draft_id: 'draft-3', material_id: materialIds[2], source_material_ids: [materialIds[2]], materials: [{ material_id: materialIds[2], title: '材料 3.md' }], title: '到期未还与催收证据', evidence_type: 'document', proof_purpose: '证明到期后未按约还款', summary: '催收摘要', reasoning: '催收理由', confidence: 0.93 },
    ]

    const beforeEvidence = await prisma.evidence.count({ where: { matter_id: markerMatterId } })
    const confirmRes = await fetch(`${BASE}/intake/confirm-evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matter_id: markerMatterId, evidence_drafts: drafts }),
    })

    expect(confirmRes.status).toBe(200)
    const confirmBody = await confirmRes.json()
    expect(confirmBody.created_evidence).toHaveLength(3)

    const stored = await prisma.evidence.findMany({ where: { matter_id: markerMatterId }, orderBy: { created_at: 'asc' } })
    expect(stored.length - beforeEvidence).toBe(3)
    expect(stored.map((e: any) => e.title)).toEqual(['借贷合意证据', '借款资金交付证据', '到期未还与催收证据'])
    expect(new Set(stored.map((e: any) => e.evidence_id)).size).toBe(3)
    expect(stored.every((e: any) => String(e.description || '').includes('摘要：'))).toBe(true)
  })

  it('confirm-evidence validation failures', async () => {
    const res1 = await fetch(`${BASE}/intake/confirm-evidence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evidence_drafts: [] }) })
    expect(res1.status).toBe(400)

    const res2 = await fetch(`${BASE}/intake/confirm-evidence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: 'x', evidence_drafts: [] }) })
    expect(res2.status).toBe(400)
  })

  it('confirm-material returns 400 when matter_id missing', async () => {
    const res = await fetch(`${BASE}/intake/confirm-material`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'client', files: [{ name: 'x.pdf' }] }),
    })
    expect(res.status).toBe(400)
  })

  it('challenge-draft for opponent evidence returns drafts and does not create formal objects', async () => {
    const markerMatterId = `mock-intake-${Date.now()}-challenge`

    // create matter fixture
    await prisma.matter.create({ data: { matter_id: markerMatterId, title: 'Challenge Matter', description: '', matter_type: 'test', status: 'active' } })

    const beforeDocument = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    const beforeKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const beforeTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `

    // generate opponent evidence drafts via API
    const materials = [{ material_id: `mat-${Date.now()}`, title: '对方借条.pdf', material_type: 'document', source: 'opponent', content: '借条载明借款金额、借款人、出借人和还款期限。' }]

    const draftRes = await fetch(`${BASE}/intake/evidence-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matter_id: markerMatterId, materials }),
    })
    expect(draftRes.status).toBe(200)
    const draftBody = await draftRes.json()
    expect(Array.isArray(draftBody.evidence_drafts)).toBe(true)

    // call challenge-draft
    const challengeRes = await fetch(`${BASE}/intake/challenge-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matter_id: markerMatterId, evidence_drafts: draftBody.evidence_drafts }),
    })
    expect(challengeRes.status).toBe(200)
    const challengeBody = await challengeRes.json()
    expect(challengeBody.status).toBe('challenge_draft_ready')
    expect(Array.isArray(challengeBody.challenge_opinion_drafts)).toBe(true)
    expect(challengeBody.challenge_opinion_drafts.length).toBeGreaterThan(0)
    expect(challengeBody.challenge_opinion_drafts[0].requires_lawyer_confirmation).toBe(true)

    const afterDocument = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    const afterKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const afterTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `

    expect(afterDocument[0].count).toBe(beforeDocument[0].count)
    expect(afterKnowledge[0].count).toBe(beforeKnowledge[0].count)
    expect(afterTimeline[0].count).toBe(beforeTimeline[0].count)
  })

  it('challenge-draft validation failures', async () => {
    // missing matter_id
    const r1 = await fetch(`${BASE}/intake/challenge-draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evidence_drafts: [] }) })
    expect(r1.status).toBe(400)

    // empty drafts
    const r2 = await fetch(`${BASE}/intake/challenge-draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: 'x', evidence_drafts: [] }) })
    expect(r2.status).toBe(400)

    // non-opponent source should fail
    const badDraft = [{ draft_id: 'd1', material_id: 'm1', title: 't', evidence_type: 'document', proof_purpose: 'p', source: 'client' }]
    const r3 = await fetch(`${BASE}/intake/challenge-draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: 'x', evidence_drafts: badDraft }) })
    expect(r3.status).toBe(400)
  })

  it('confirm-challenge-document creates documents for confirmed drafts only', async () => {
    const markerMatterId = `mock-intake-${Date.now()}-confirm-doc`

    // create matter fixture
    await prisma.matter.create({ data: { matter_id: markerMatterId, title: 'Confirm Doc Matter', description: '', matter_type: 'test', status: 'active' } })

    const beforeDocument = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    const beforeKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const beforeTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `

    // generate opponent evidence drafts
    const materials = [{ material_id: `mat-${Date.now()}`, title: '对方借条.pdf', material_type: 'document', source: 'opponent', content: '借条载明借款金额、借款人、出借人和还款期限。' }]
    const draftRes = await fetch(`${BASE}/intake/evidence-draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: markerMatterId, materials }) })
    expect(draftRes.status).toBe(200)
    const draftBody = await draftRes.json()

    // generate challenge drafts
    const challengeRes = await fetch(`${BASE}/intake/challenge-draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: markerMatterId, evidence_drafts: draftBody.evidence_drafts }) })
    expect(challengeRes.status).toBe(200)
    const challengeBody = await challengeRes.json()
    expect(Array.isArray(challengeBody.challenge_opinion_drafts)).toBe(true)

    // confirm and create documents
    const confirmRes = await fetch(`${BASE}/intake/confirm-challenge-document`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: markerMatterId, challenge_opinion_drafts: challengeBody.challenge_opinion_drafts }) })
    expect(confirmRes.status).toBe(200)
    const confirmBody = await confirmRes.json()
    expect(confirmBody.status).toBe('challenge_document_created')
    expect(Array.isArray(confirmBody.created_documents)).toBe(true)
    expect(confirmBody.created_documents.length).toBe(challengeBody.challenge_opinion_drafts.length)
    expect(confirmBody.created_documents[0].matter_id).toBe(markerMatterId)
    expect(confirmBody.created_documents[0].document_type).toBe('challenge_opinion')
    expect(confirmBody.created_documents[0].version).toBe('v1')
    expect(confirmBody.created_documents[0].status).toBe('draft')

    const afterDocument = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    const afterKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const afterTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `

    expect(Number(afterDocument[0].count - beforeDocument[0].count)).toBe(confirmBody.created_documents.length)
    expect(afterKnowledge[0].count).toBe(beforeKnowledge[0].count)
    expect(afterTimeline[0].count).toBe(beforeTimeline[0].count)
  })

  it('confirm-challenge-document validation failures', async () => {
    const r1 = await fetch(`${BASE}/intake/confirm-challenge-document`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challenge_opinion_drafts: [] }) })
    expect(r1.status).toBe(400)

    const r2 = await fetch(`${BASE}/intake/confirm-challenge-document`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: 'x', challenge_opinion_drafts: [] }) })
    expect(r2.status).toBe(400)

    // draft without lawyer confirmation should fail
    const badDraft = [{ draft_id: 'd1', evidence_draft_id: 'ed1', title: 't', challenge_points: {}, suggested_opinion: 's', requires_lawyer_confirmation: false }]
    const r3 = await fetch(`${BASE}/intake/confirm-challenge-document`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: 'x', challenge_opinion_drafts: badDraft }) })
    expect(r3.status).toBe(400)
  })

  it('document-update-suggestions for evidence_created trigger', async () => {
    const markerMatterId = `mock-intake-${Date.now()}-dus-e`
    await prisma.matter.create({ data: { matter_id: markerMatterId, title: 'DUS Matter E', description: '', matter_type: 'test', status: 'active' } })

    const beforeDocument = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    const beforeKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const beforeTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `

    // create a material fixture required for evidence
    const material = await prisma.material.create({ data: { material_id: `mat-${Date.now()}`, matter_id: markerMatterId, title: 'file.pdf', material_type: 'document', source: 'client', storage_uri: '', status: 'active' } })

    // create an evidence fixture referencing the material
    const evidence = await prisma.evidence.create({ data: { evidence_id: `ev-${Date.now()}`, matter_id: markerMatterId, material_id: material.material_id, title: 'ev file', evidence_type: 'document', description: '', relevance: '', status: 'active' } })

    const res = await fetch(`${BASE}/intake/document-update-suggestions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: markerMatterId, trigger: { type: 'evidence_created', id: evidence.evidence_id, title: evidence.title } }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('document_update_suggestions_ready')
    expect(Array.isArray(body.document_update_suggestions)).toBe(true)

    const types = body.document_update_suggestions.map((s: any) => s.target_document_type)
    expect(types).toEqual(expect.arrayContaining(['evidence_catalog', 'representation', 'hearing_outline']))

    const afterDocument = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    const afterKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const afterTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `

    expect(afterDocument[0].count).toBe(beforeDocument[0].count)
    expect(afterKnowledge[0].count).toBe(beforeKnowledge[0].count)
    expect(afterTimeline[0].count).toBe(beforeTimeline[0].count)
  })

  it('document-update-suggestions for challenge_document_created trigger', async () => {
    const markerMatterId = `mock-intake-${Date.now()}-dus-c`
    await prisma.matter.create({ data: { matter_id: markerMatterId, title: 'DUS Matter C', description: '', matter_type: 'test', status: 'active' } })

    // create a challenge document fixture
    const doc = await prisma.document.create({ data: { document_id: `doc-${Date.now()}`, matter_id: markerMatterId, title: 'challenge doc', document_type: 'challenge_opinion', content_uri: '', version: 'v1', status: 'draft' } })

    // capture counts AFTER fixture creation to ensure we only measure changes caused by the API call
    const beforeDocument = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    const beforeKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const beforeTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `

    const res = await fetch(`${BASE}/intake/document-update-suggestions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: markerMatterId, trigger: { type: 'challenge_document_created', id: doc.document_id, title: doc.title } }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('document_update_suggestions_ready')
    expect(Array.isArray(body.document_update_suggestions)).toBe(true)

    const types = body.document_update_suggestions.map((s: any) => s.target_document_type)
    expect(types).toEqual(expect.arrayContaining(['representation', 'hearing_outline']))

    const afterDocument = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    const afterKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const afterTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `

    expect(afterDocument[0].count).toBe(beforeDocument[0].count)
    expect(afterKnowledge[0].count).toBe(beforeKnowledge[0].count)
    expect(afterTimeline[0].count).toBe(beforeTimeline[0].count)
  })

  it('document-update-suggestions validation failures', async () => {
    const r1 = await fetch(`${BASE}/intake/document-update-suggestions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trigger: { type: 'evidence_created', id: 'x' } }) })
    expect(r1.status).toBe(400)

    const r2 = await fetch(`${BASE}/intake/document-update-suggestions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: 'x', trigger: { type: 'invalid_type', id: 'x' } }) })
    expect(r2.status).toBe(400)
  })

  it('confirm-document-update creates new document versions and preserves old documents', async () => {
    const markerMatterId = `mock-intake-${Date.now()}-cdu`
    await prisma.matter.create({ data: { matter_id: markerMatterId, title: 'CDU Matter', description: '', matter_type: 'test', status: 'active' } })

    // create an original document to be preserved
    const original = await prisma.document.create({ data: { document_id: `doc-orig-${Date.now()}`, matter_id: markerMatterId, title: 'Original Doc', document_type: 'representation', content_uri: '', version: 'v1', status: 'active' } })

    const beforeDocs = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `

    const suggestions = [
      { suggestion_id: 's1', target_document_type: 'representation', target_title: '代理词（更新）', reason: 'reason', suggested_change_summary: 'summary', requires_lawyer_confirmation: true },
      { suggestion_id: 's2', target_document_type: 'hearing_outline', target_title: '庭审提纲（更新）', reason: 'reason', suggested_change_summary: 'summary', requires_lawyer_confirmation: true },
    ]

    const res = await fetch(`${BASE}/intake/confirm-document-update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: markerMatterId, document_update_suggestions: suggestions }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('document_version_created')
    expect(Array.isArray(body.created_versions)).toBe(true)
    expect(body.created_versions.length).toBe(suggestions.length)
    expect(body.created_versions[0].version).toBe('v2')
    expect(body.created_versions[0].status).toBe('draft')

    const afterDocs = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    expect(Number(afterDocs[0].count - beforeDocs[0].count)).toBe(suggestions.length)

    // ensure original document still exists
    const found = await prisma.document.findUnique({ where: { document_id: original.document_id } })
    expect(found).not.toBeNull()

    const afterKnowledge = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM knowledge WHERE matter_id = ${markerMatterId}
    `
    const afterTimeline = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM timelines WHERE matter_id = ${markerMatterId}
    `
    expect(afterKnowledge[0].count).toBe(BigInt(0))
    expect(afterTimeline[0].count).toBe(BigInt(0))
  })

  it('confirm-document-update validation failures', async () => {
    const r1 = await fetch(`${BASE}/intake/confirm-document-update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document_update_suggestions: [] }) })
    expect(r1.status).toBe(400)

    const r2 = await fetch(`${BASE}/intake/confirm-document-update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: 'x', document_update_suggestions: [] }) })
    expect(r2.status).toBe(400)

    const bad = [{ suggestion_id: 's', target_document_type: 'representation', target_title: 't', requires_lawyer_confirmation: false }]
    const r3 = await fetch(`${BASE}/intake/confirm-document-update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: 'x', document_update_suggestions: bad }) })
    expect(r3.status).toBe(400)
  })

  it('idempotency prevents duplicate creations for confirm-material', async () => {
    const markerMatterId = `mock-intake-${Date.now()}-idem-mat`
    await prisma.matter.create({ data: { matter_id: markerMatterId, title: 'Idem Mat Matter', description: '', matter_type: 'test', status: 'active' } })

    const beforeMaterials = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM materials WHERE matter_id = ${markerMatterId}
    `

    const idem = `idem-${Date.now()}`

    const res1 = await fetch(`${BASE}/intake/confirm-material`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: markerMatterId, source: 'client', files: [{ name: 'x.pdf', mime_type: 'application/pdf' }], analysis: { summary: 's' }, idempotency_key: idem }) })
    expect(res1.status).toBe(200)
    const b1 = await res1.json()
    expect(Array.isArray(b1.created_materials)).toBe(true)

    const res2 = await fetch(`${BASE}/intake/confirm-material`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: markerMatterId, source: 'client', files: [{ name: 'x.pdf', mime_type: 'application/pdf' }], analysis: { summary: 's' }, idempotency_key: idem }) })
    expect(res2.status).toBe(200)
    const b2 = await res2.json()
    expect(b2.status).toBe(b1.status)

    const afterMaterials = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM materials WHERE matter_id = ${markerMatterId}
    `
    expect(Number(afterMaterials[0].count - beforeMaterials[0].count)).toBe(1)
  })

  it('idempotency prevents duplicate creations for confirm-evidence', async () => {
    const markerMatterId = `mock-intake-${Date.now()}-idem-ev`
    await prisma.matter.create({ data: { matter_id: markerMatterId, title: 'Idem EV Matter', description: '', matter_type: 'test', status: 'active' } })
    const material = await prisma.material.create({ data: { material_id: `mat-${Date.now()}`, matter_id: markerMatterId, title: 'file.pdf', material_type: 'document', source: 'client', storage_uri: '', status: 'active' } })

    const beforeEvidence = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM evidence WHERE matter_id = ${markerMatterId}
    `

    const drafts = [{ draft_id: 'd1', material_id: material.material_id, title: material.title, evidence_type: material.material_type, proof_purpose: 'p', source: 'client' }]
    const idem = `idem-ev-${Date.now()}`

    const r1 = await fetch(`${BASE}/intake/confirm-evidence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: markerMatterId, evidence_drafts: drafts, idempotency_key: idem }) })
    expect(r1.status).toBe(200)
    const j1 = await r1.json()
    expect(Array.isArray(j1.created_evidence)).toBe(true)

    const r2 = await fetch(`${BASE}/intake/confirm-evidence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: markerMatterId, evidence_drafts: drafts, idempotency_key: idem }) })
    expect(r2.status).toBe(200)
    const j2 = await r2.json()
    expect(j2.status).toBe(j1.status)

    const afterEvidence = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM evidence WHERE matter_id = ${markerMatterId}
    `
    expect(Number(afterEvidence[0].count - beforeEvidence[0].count)).toBe(1)
  })

  it('idempotency prevents duplicate creations for confirm-challenge-document', async () => {
    const markerMatterId = `mock-intake-${Date.now()}-idem-chdoc`
    await prisma.matter.create({ data: { matter_id: markerMatterId, title: 'Idem ChDoc Matter', description: '', matter_type: 'test', status: 'active' } })

    const beforeDocuments = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `

    const drafts = [{ draft_id: 'd1', evidence_draft_id: 'ed1', title: 't', challenge_points: {}, suggested_opinion: 's', requires_lawyer_confirmation: true }]
    const idem = `idem-ch-${Date.now()}`

    const res1 = await fetch(`${BASE}/intake/confirm-challenge-document`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: markerMatterId, challenge_opinion_drafts: drafts, idempotency_key: idem }) })
    expect(res1.status).toBe(200)
    const jb1 = await res1.json()
    expect(Array.isArray(jb1.created_documents)).toBe(true)

    const res2 = await fetch(`${BASE}/intake/confirm-challenge-document`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: markerMatterId, challenge_opinion_drafts: drafts, idempotency_key: idem }) })
    expect(res2.status).toBe(200)
    const jb2 = await res2.json()
    expect(jb2.status).toBe(jb1.status)

    const afterDocuments = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    expect(Number(afterDocuments[0].count - beforeDocuments[0].count)).toBe(jb1.created_documents.length)
  })

  it('idempotency prevents duplicate creations for confirm-document-update', async () => {
    const markerMatterId = `mock-intake-${Date.now()}-idem-docup`
    await prisma.matter.create({ data: { matter_id: markerMatterId, title: 'Idem DocUp Matter', description: '', matter_type: 'test', status: 'active' } })

    const beforeDocuments = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `

    const suggestions = [
      { suggestion_id: 's1', target_document_type: 'representation', target_title: '代理词（更新）', reason: 'r', suggested_change_summary: 'sum', requires_lawyer_confirmation: true }
    ]
    const idem = `idem-docup-${Date.now()}`

    const r1 = await fetch(`${BASE}/intake/confirm-document-update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: markerMatterId, document_update_suggestions: suggestions, idempotency_key: idem }) })
    expect(r1.status).toBe(200)
    const j1 = await r1.json()
    expect(Array.isArray(j1.created_versions)).toBe(true)

    const r2 = await fetch(`${BASE}/intake/confirm-document-update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matter_id: markerMatterId, document_update_suggestions: suggestions, idempotency_key: idem }) })
    expect(r2.status).toBe(200)
    const j2 = await r2.json()
    expect(j2.status).toBe(j1.status)

    const afterDocuments = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM documents WHERE matter_id = ${markerMatterId}
    `
    expect(Number(afterDocuments[0].count - beforeDocuments[0].count)).toBe(j1.created_versions.length)
  })
})
