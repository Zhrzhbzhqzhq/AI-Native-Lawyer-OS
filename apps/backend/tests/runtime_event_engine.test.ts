import { describe, it, expect } from 'vitest'
import RuntimeEventEngine from '../src/runtime/runtimeEventEngine'
import ActionExecutorRuntime from '../src/runtime/actionExecutorRuntime'
import RuntimeDirector from '../src/runtime/runtimeDirector'

describe('RuntimeEventEngine', ()=>{
  it('append and list and latest', ()=>{
    const ev = new RuntimeEventEngine()
    const a = ev.emit('m-1','TaskCreated',{ task_id: 't1' })
    expect(a.event_id).toBeTruthy()
    const list = ev.list('m-1')
    expect(list.length).toBeGreaterThanOrEqual(1)
    const latest = ev.latest('m-1')
    expect(latest?.type).toBe('TaskCreated')
  })

  it('executor emits event in test mode', async ()=>{
    process.env.NODE_ENV = 'test'
    const prisma: any = {} as any
    const exec = new ActionExecutorRuntime(prisma)
    // create a fake proposal in repository
    const repo = await import('../src/repositories/actionProposalRepository')
    const r = new repo.default()
    const created = await r.createMany([{ matter_id: 'm-2', action: 'create_task', title: 'T', reason: '', status: 'approved', source: 'planner', planner_provider: 'p', planner_model: 'm' }])
    const pid = created[0].proposal_id
    const res = await exec.execute(pid)
    expect(res.status).toBe('executed')
    const ev = new (await import('../src/runtime/runtimeEventEngine')).default()
    const latest = ev.latest('m-2')
    expect(latest?.type).toBe('ProposalExecuted')
  })

  it('director reads latest event', async ()=>{
    const dd = new RuntimeDirector({} as any)
    const ev = new (await import('../src/runtime/runtimeEventEngine')).default()
    ev.emit('m-3','ProposalApproved',{ proposal_id: 'p1' })
    const out = await dd.evaluateLatestEvent('m-3')
    expect(out).toBeTruthy()
    expect(out?.decision.type).toBe('plan')
  })
})
