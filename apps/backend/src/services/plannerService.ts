import PromptBuilderService from './promptBuilderService'
import MockLlmAdapter from '../ai/mockLlmAdapter'
import WorkflowInstanceService from './workflowInstanceService'

export class PlannerService {
  promptBuilder: PromptBuilderService
  adapter: MockLlmAdapter
  workflowInstanceService: WorkflowInstanceService

  constructor(prisma?: any) {
    // PromptBuilderService expects prisma but it's optional for tests; keep compatibility
    this.promptBuilder = new PromptBuilderService(prisma)
    this.adapter = new MockLlmAdapter()
    this.workflowInstanceService = new WorkflowInstanceService()
  }

  async planForMatter(matter_id: string) {
    const promptPack = await this.promptBuilder.buildPromptPack(matter_id)
    const wf = await this.workflowInstanceService.getForMatter(matter_id)
    const llmResp = await this.adapter.generate(promptPack)

    const resp = llmResp?.response || {}
    const recommended_actions = (resp.next_steps || resp.lawyer_actions || []).map((a: any, idx: number) => ({ action: a.action || `action_${idx}`, title: a.title || String(a), reason: a.reason || resp.summary || '' }))

    return {
      matter_id,
      current_stage: wf?.current_stage || (promptPack?.context_pack?.matter?.status as any) || null,
      recommended_actions,
      missing_items: resp.missing_items || [],
      risks: resp.risks || [],
      generated_at: new Date().toISOString()
    }
  }
}

export default PlannerService
