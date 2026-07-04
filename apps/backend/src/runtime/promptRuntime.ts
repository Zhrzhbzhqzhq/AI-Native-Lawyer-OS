import type { PrismaClient } from '@lawdesk/database';
import ContextBuilder from './contextBuilder';

export interface PromptRuntimePack {
  matter_id: string;
  system_prompt: string;
  user_prompt: string;
  context_runtime: any;
  generated_at: string;
}

export class PromptRuntime {
  contextBuilder: ContextBuilder;

  constructor(prisma: PrismaClient) {
    this.contextBuilder = new ContextBuilder(prisma);
  }

  async build(matterId: string): Promise<PromptRuntimePack> {
    const context = await this.contextBuilder.build(matterId);

    const system_prompt = `You are LawDesk AI Lawyer Assistant.
- Do NOT invent facts. If information is missing, state what is unknown and ask clarifying questions.
- Clearly separate: Facts, Risks, Suggestions, and Unknowns in your output.
- Before taking any action or making changes, ALWAYS request explicit lawyer confirmation.
- Use the provided Matter Object Graph as the source of truth for the current case.`;

    let user_prompt = `Please:
1) Summarize the current matter briefly.
2) Identify and list potential legal and factual risks.
3) Recommend the next steps the lawyer should take.
4) List missing materials or evidence needed to proceed.
5) Propose immediate actions the lawyer can take right now.`;

    // If using MiniMax token_plan, instruct model to return strict JSON only
    const isMinimaxTokenPlan = (process.env.AI_PROVIDER || '').toLowerCase() === 'minimax' && (process.env.MINIMAX_AUTH_MODE || '').toLowerCase() === 'token_plan'
    if (isMinimaxTokenPlan) {
      user_prompt += `\n\nIMPORTANT: ONLY return a single JSON object and NOTHING else. Do NOT include markdown, explanation, or extraneous text. The JSON must have this structure:\n{\n  "current_stage": "<current_stage>",\n  "recommended_actions": [ { "action": "create_task|create_research|create_document", "title":"...", "reason":"..." } ],\n  "missing_items": [],\n  "risks": []\n}`
    }

    return {
      matter_id: matterId,
      system_prompt,
      user_prompt,
      context_runtime: context,
      generated_at: new Date().toISOString(),
    };
  }
}

export default PromptRuntime;
