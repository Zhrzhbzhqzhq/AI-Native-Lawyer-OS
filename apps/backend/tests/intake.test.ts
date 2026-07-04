import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fetch from 'node-fetch'
import buildApp from '../src/server'
import { createPrismaClient } from '@lawdesk/database'

let app: any
let BASE = ''
let prisma: any

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://qingzhang@localhost:5432/lawdesk'
  prisma = createPrismaClient()

  app = await buildApp()
  await app.listen({ port: 0 })
  const addr: any = app.server.address()
  const port = addr && addr.port ? addr.port : 4000
  BASE = `http://127.0.0.1:${port}`
})

afterAll(async () => {
  await app.close()
  await prisma.$disconnect()
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

    const materials = [{ material_id: `mat-${Date.now()}`, title: 'file.pdf', material_type: 'document', source: 'client' }]

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
    const material = await prisma.material.create({ data: { material_id: `mat-${Date.now()}`, matter_id: markerMatterId, title: 'file.pdf', material_type: 'document', source: 'client', storage_uri: '', status: 'active' } })

    // generate drafts using the API
    const draftRes = await fetch(`${BASE}/intake/evidence-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matter_id: markerMatterId, materials: [{ material_id: material.material_id, title: material.title, material_type: material.material_type, source: 'client' }] }),
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
})