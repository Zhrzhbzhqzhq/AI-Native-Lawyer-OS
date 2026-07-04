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
})