import { describe, it, expect } from 'vitest'
import MatterStateEngine from '../src/runtime/matterStateEngine'

const baseSnapshot = () => ({
  matter: { status: null },
  tasks: { total: 0, open: 0 },
  documents: { total: 0, draft: 0, final: 0 },
  evidence: { total: 0 },
  research: { total: 0 },
})

describe('MatterStateEngine', ()=>{
  it('empty matter => intake', ()=>{
    const s = baseSnapshot()
    const out = MatterStateEngine.evaluate(s as any)
    expect(out.current_stage).toBe('intake')
    expect(out.completion).toBe(10)
  })

  it('open task => accepted', ()=>{
    const s = baseSnapshot(); s.tasks.open = 1
    const out = MatterStateEngine.evaluate(s as any)
    expect(out.current_stage).toBe('accepted')
  })

  it('evidence => evidence_collection', ()=>{
    const s = baseSnapshot(); s.evidence.total = 2
    const out = MatterStateEngine.evaluate(s as any)
    expect(out.current_stage).toBe('evidence_collection')
  })

  it('research => research', ()=>{
    const s = baseSnapshot(); s.research.total = 1
    const out = MatterStateEngine.evaluate(s as any)
    expect(out.current_stage).toBe('research')
  })

  it('draft document => drafting', ()=>{
    const s = baseSnapshot(); s.documents.draft = 1
    const out = MatterStateEngine.evaluate(s as any)
    expect(out.current_stage).toBe('drafting')
  })

  it('final document => ready_to_file', ()=>{
    const s = baseSnapshot(); s.documents.final = 1
    const out = MatterStateEngine.evaluate(s as any)
    expect(out.current_stage).toBe('ready_to_file')
  })

  it('archived matter => archived', ()=>{
    const s = baseSnapshot(); s.matter.status = 'archived'
    const out = MatterStateEngine.evaluate(s as any)
    expect(out.current_stage).toBe('archived')
    expect(out.completion).toBe(100)
  })

  it('blocking rules', ()=>{
    const s = baseSnapshot(); s.tasks.open = 0
    const out = MatterStateEngine.evaluate(s as any)
    expect(out.blocking).toContain('No evidence uploaded')
    expect(out.blocking).toContain('No legal research recorded')
    expect(out.blocking).toContain('No draft document prepared')
    expect(out.blocking).toContain('No active task')
  })

  it('signals correct', ()=>{
    const s = baseSnapshot(); s.tasks.open = 1; s.evidence.total = 1; s.research.total = 1; s.documents.draft = 1
    const out = MatterStateEngine.evaluate(s as any)
    expect(out.signals).toContain('HAS_EVIDENCE')
    expect(out.signals).toContain('HAS_RESEARCH')
    expect(out.signals).toContain('HAS_DRAFT_DOCUMENT')
    expect(out.signals).toContain('HAS_OPEN_TASK')
  })
})
