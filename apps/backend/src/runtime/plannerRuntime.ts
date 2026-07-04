import type { PrismaClient } from '@lawdesk/database';
import PromptRuntime from './promptRuntime';
import ProviderManager from '../ai/providerManager';
import WorkflowInstanceService from '../services/workflowInstanceService';

export class PlannerRuntime {
  promptRuntime: PromptRuntime;
  workflowInstanceService: WorkflowInstanceService;

  constructor(prisma: PrismaClient) {
    this.promptRuntime = new PromptRuntime(prisma);
    // adapter selection is deferred to plan() so tests can override env/fetch
    this.workflowInstanceService = new WorkflowInstanceService();
  }

  async plan(matterId: string) {
    const promptPack = await this.promptRuntime.build(matterId);
    const wf = await this.workflowInstanceService.getForMatter(matterId);

    // Adapter expects a prompt pack; include context_pack alias for compatibility
    const adapter = ProviderManager.getAdapter();
    const adapterInput = { ...promptPack, context_pack: promptPack.context_runtime };

    // If using MiniMax token_plan, enforce JSON-only output in the user prompt
    const isMinimaxTokenPlan = (process.env.AI_PROVIDER || '').toLowerCase() === 'minimax' && (process.env.MINIMAX_AUTH_MODE || '').toLowerCase() === 'token_plan'
    if (isMinimaxTokenPlan) {
      adapterInput.user_prompt = `ONLY return a single JSON object and NOTHING else. Do NOT include markdown, explanation, or extraneous text. The JSON must have this structure:\n{\n  "current_stage": "<current_stage>",\n  "recommended_actions": [ { "action": "create_task|create_research|create_document", "title":"...", "reason":"..." } ],\n  "missing_items": [],\n  "risks": []\n}`
    }

    const llmResp = await adapter.generate(adapterInput);

    const resp = llmResp?.response || {};

    let recommended_actions: any[] = []

    // If provider is minimax (token_plan Anthropic) try to extract text from response.content[0].text
    if ((llmResp?.provider || '').toLowerCase() === 'minimax') {
      let text = resp?.content?.[0]?.text ?? resp?.completion ?? resp?.text ?? null
      if (text && String(text).trim().length > 0) {
        const ts = String(text)
        // If text contains a fenced ```json block, extract inner JSON
        const fenced = ts.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
        const candidate = fenced ? fenced[1] : ts
        // try parse as JSON structured output
        try {
          const parsed = JSON.parse(candidate)
          const source = parsed.recommended_actions || parsed.next_steps || parsed.lawyer_actions || parsed
          if (Array.isArray(source)) {
            recommended_actions = source.map((a: any, idx: number) => ({
              action: a.action || `action_${idx}`,
              title: a.title || String(a || ''),
              reason: a.reason || parsed.summary || '',
            }))
          } else if (parsed && typeof parsed === 'object' && (parsed.action || parsed.title)) {
            // single action object
            recommended_actions.push({ action: parsed.action || 'create_task', title: parsed.title || String(parsed || ''), reason: parsed.reason || parsed.summary || '' })
          }
        } catch (_e) {
          // not JSON — try a lightweight heuristic parser (lines or bullets)
          const lines = ts.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
          for (const ln of lines) {
            if (/^[-*]\s*(create_task|draft_document|assign_task|create_research)/i.test(ln)) {
              const parts = ln.replace(/^[-*]\s*/,'').split(/:\s*/)
              recommended_actions.push({ action: parts[0].toLowerCase(), title: parts[1] || ln, reason: '' })
            }
          }
          if (recommended_actions.length === 0) {
            recommended_actions.push({ action: 'create_task', title: 'Review AI recommendation', reason: 'MiniMax returned unstructured advice' })
          }
        }
        if (recommended_actions.length === 0) {
          recommended_actions.push({ action: 'create_task', title: 'Review AI recommendation', reason: 'MiniMax returned unstructured advice' })
        }
      }
    }

    // If still empty, fall back to structured fields from mock or other adapters
    if (!recommended_actions || recommended_actions.length === 0) {
      recommended_actions = (resp.next_steps || resp.lawyer_actions || []).map((a: any, idx: number) => ({
        action: a.action || `action_${idx}`,
        title: a.title || String(a || ''),
        reason: a.reason || resp.summary || '',
      }))
    }

    return {
      matter_id: matterId,
      current_stage: wf?.current_stage || (promptPack?.context_runtime?.graph?.matter?.status as any) || null,
      recommended_actions,
      missing_items: resp.missing_items || [],
      risks: resp.risks || [],
      prompt_runtime: promptPack,
      provider: llmResp?.provider || 'mock',
      model: llmResp?.model || 'mock-lawdesk-v1',
      generated_at: new Date().toISOString(),
    };
  }
}

export default PlannerRuntime;
