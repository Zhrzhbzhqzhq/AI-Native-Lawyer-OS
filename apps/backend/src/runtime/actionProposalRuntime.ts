import type { PrismaClient } from '@lawdesk/database'
import ActionProposalRepository from '../repositories/actionProposalRepository'
import PlannerRuntime from './plannerRuntime'

export class ActionProposalRuntime {
  plannerRuntime: PlannerRuntime
  repo: ActionProposalRepository

  constructor(prisma: PrismaClient) {
    this.plannerRuntime = new PlannerRuntime(prisma)
    this.repo = new ActionProposalRepository()
  }

  async generate(matterId: string) {
    // Use real planner runtime (no more mock planner)
    const plan = await this.plannerRuntime.plan(matterId)

    const recommendations = plan.recommended_actions || []

    const proposalsInput = recommendations.map((r: any) => ({
      matter_id: matterId,
      action: r.action,
      title: r.title,
      reason: r.reason,
      status: 'pending' as const,
      source: 'planner' as const,
      planner_provider: plan.provider,
      planner_model: plan.model,
    }))

    const created = await this.repo.createMany(proposalsInput)

    return { proposals: created, plan }
  }

  async list(matterId: string) {
    const list = await this.repo.listByMatter(matterId)
    // Only return selected fields required by API
    return list.map((p) => ({
      proposal_id: p.proposal_id,
      action: p.action,
      title: p.title,
      reason: p.reason,
      status: p.status,
      source: p.source,
      planner_provider: p.planner_provider,
      planner_model: p.planner_model,
    }))
  }

  async updateStatus(proposalId: string, status: 'approved' | 'rejected') {
    return this.repo.updateStatus(proposalId, status)
  }
}

export default ActionProposalRuntime
