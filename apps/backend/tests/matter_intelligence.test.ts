import { describe, it, expect } from 'vitest'
import MatterIntelligenceEngine from '../src/runtime/matterIntelligenceEngine'

const baseSnapshot = () => ({
  matter: { status: null },
  tasks: { total: 0, open: 0 },
  documents: { total: 0, draft: 0, final: 0 },
  evidence: { total: 0 },
  research: { total: 0 },
})

describe('MatterIntelligenceEngine', ()=>{
  it('health score and alerts for empty', ()=>{
    const s = baseSnapshot()
    const out = MatterIntelligenceEngine.evaluate(s as any, { completion: 10 })
    expect(out.health.score).toBe(100 - 20 -15 -15 -10)
    expect(out.alerts.length).toBeGreaterThan(0)
  })

  it('priority high when blocking', ()=>{
    const s = baseSnapshot(); s.evidence.total = 0
    const out = MatterIntelligenceEngine.evaluate(s as any, { completion: 10 })
    expect(out.priority.level).toBe('high')
  })

  it('next action priority evidence->research->draft', ()=>{
    const s1 = baseSnapshot(); s1.evidence.total = 0
    const o1 = MatterIntelligenceEngine.evaluate(s1 as any, {})
    expect(o1.next_action.title).toBe('Upload evidence')

    const s2 = baseSnapshot(); s2.evidence.total = 1; s2.research.total = 0
    const o2 = MatterIntelligenceEngine.evaluate(s2 as any, {})
    expect(o2.next_action.title).toBe('Create legal research')

    const s3 = baseSnapshot(); s3.evidence.total = 1; s3.research.total = 1; s3.documents.draft = 0
    const o3 = MatterIntelligenceEngine.evaluate(s3 as any, {})
    expect(o3.next_action.title).toBe('Draft documents')
  })
})
