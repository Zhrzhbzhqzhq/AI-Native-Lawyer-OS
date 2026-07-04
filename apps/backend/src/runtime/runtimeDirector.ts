import type { PrismaClient } from '@lawdesk/database'
import MatterSnapshotRuntime from './matterSnapshotRuntime'

export type DirectorDecision = {
  type: 'plan' | 'wait' | 'review' | 'execute' | 'blocked'
  reason: string
  recommended_next: string | null
}

export class RuntimeDirector {
  prisma: PrismaClient
  snapshotRuntime: MatterSnapshotRuntime

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.snapshotRuntime = new MatterSnapshotRuntime(prisma)
  }

  // core decision logic using snapshot (for unit tests)
  static decideFromSnapshot(snapshot: any): { decision: DirectorDecision; signals: string[] } {
    const intelligence = snapshot?.ai?.intelligence || null
    const workflow = snapshot?.workflow || null
    const tasks = snapshot?.tasks || { open: 0 }

    const signals = (intelligence?.alerts || [])

    // Rule 1
    if (intelligence && intelligence.health && intelligence.health.status === 'blocked') {
      return { decision: { type: 'blocked', reason: 'Health blocked', recommended_next: intelligence.next_action?.title || null }, signals }
    }

    // Rule 2
    if (intelligence && intelligence.priority && intelligence.priority.level === 'high') {
      return { decision: { type: 'plan', reason: 'High priority', recommended_next: intelligence.next_action?.title || null }, signals }
    }

    // Rule 3
    if (workflow && Array.isArray(workflow.blocking) && workflow.blocking.length > 0) {
      return { decision: { type: 'review', reason: 'Workflow has blocking items', recommended_next: intelligence?.next_action?.title || null }, signals }
    }

    // Rule 4
    if ((tasks.open || 0) > 0) {
      return { decision: { type: 'wait', reason: 'Open tasks exist', recommended_next: intelligence?.next_action?.title || null }, signals }
    }

    // Default
    return { decision: { type: 'plan', reason: 'Default plan', recommended_next: intelligence?.next_action?.title || null }, signals }
  }

  async decide(matterId: string) {
    const snapshot = await this.snapshotRuntime.build(matterId)
    const { decision, signals } = RuntimeDirector.decideFromSnapshot(snapshot)
    return {
      matter_id: matterId,
      decision,
      signals,
      snapshot,
      generated_at: new Date().toISOString(),
    }
  }

  // evaluate based on latest event if available
  async evaluateLatestEvent(matterId: string) {
    const { default: RuntimeEventEngine } = await import('./runtimeEventEngine')
    const engine = new RuntimeEventEngine()
    const latest = engine.latest(matterId)
    if (latest) {
      // simple mapping: certain event types map directly to decisions
      const t = latest.type
      if (t === 'ProposalExecuted') return { decision: { type: 'execute', reason: 'Proposal executed', recommended_next: null }, latest }
      if (t === 'ProposalApproved') return { decision: { type: 'plan', reason: 'Proposal approved', recommended_next: null }, latest }
      if (t === 'TaskCreated') return { decision: { type: 'wait', reason: 'New task created', recommended_next: null }, latest }
      if (t === 'MatterClosed') return { decision: { type: 'blocked', reason: 'Matter closed', recommended_next: null }, latest }
      return { decision: { type: 'review', reason: `Event ${t} observed`, recommended_next: null }, latest }
    }
    return null
  }
}

export default RuntimeDirector
