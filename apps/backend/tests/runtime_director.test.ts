import { describe, it, expect } from 'vitest'
import RuntimeDirector from '../src/runtime/runtimeDirector'

// We'll use a fake snapshot to exercise decideFromSnapshot
describe('RuntimeDirector', ()=>{
  it('director returns matter_id and snapshot included', async ()=>{
    const fakePrisma: any = {} as any
    const director = new RuntimeDirector(fakePrisma)
    // stub snapshotRuntime.build
    director.snapshotRuntime.build = async (id:string)=>({
      matter: { status: null },
      tasks: { open: 0 },
      documents: { total:0, draft:0, final:0 },
      evidence: { total:0 },
      research: { total:0 },
      workflow: { current_stage: 'intake', completion: 10, blocking: [] },
      ai: { intelligence: null },
    })
    const res = await director.decide('m-1')
    expect(res.matter_id).toBe('m-1')
    expect(res.snapshot).toBeTruthy()
  })

  it('blocked decision when intelligence blocked', ()=>{
    const snap:any = { ai: { intelligence: { health: { status: 'blocked' }, next_action: { title: 'X' }, alerts: ['a'] } }, workflow: { blocking: [] }, tasks: { open:0 } }
    const out = RuntimeDirector.decideFromSnapshot(snap)
    expect(out.decision.type).toBe('blocked')
  })

  it('high priority => plan', ()=>{
    const snap:any = { ai: { intelligence: { priority: { level: 'high' }, next_action: { title: 'X' }, alerts: [] } }, workflow: { blocking: [] }, tasks: { open:0 } }
    const out = RuntimeDirector.decideFromSnapshot(snap)
    expect(out.decision.type).toBe('plan')
  })

  it('workflow blocking => review', ()=>{
    const snap:any = { ai: { intelligence: { priority: { level: 'low' }, next_action: { title: 'X' }, alerts: [] } }, workflow: { blocking: ['b'] }, tasks: { open:0 } }
    const out = RuntimeDirector.decideFromSnapshot(snap)
    expect(out.decision.type).toBe('review')
  })

  it('open task => wait', ()=>{
    const snap:any = { ai: { intelligence: { priority: { level: 'low' }, next_action: { title: 'X' }, alerts: [] } }, workflow: { blocking: [] }, tasks: { open:1 } }
    const out = RuntimeDirector.decideFromSnapshot(snap)
    expect(out.decision.type).toBe('wait')
  })

  it('default => plan', ()=>{
    const snap:any = { ai: { intelligence: { priority: { level: 'low' }, next_action: { title: 'X' }, alerts: [] } }, workflow: { blocking: [] }, tasks: { open:0 } }
    const out = RuntimeDirector.decideFromSnapshot(snap)
    expect(out.decision.type).toBe('plan')
  })
})
