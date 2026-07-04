import type LlmAdapter from './llmAdapter';

export class MockLlmAdapter implements LlmAdapter {
  async generate(promptPack: any) {
    const matterId = promptPack.matter_id ?? (promptPack.context_pack?.matter?.matter_id ?? 'unknown')
    const now = new Date().toISOString()
    // Provide deterministic sample actions for UI/testing purposes
    return {
      matter_id: matterId,
      provider: 'mock',
      model: 'mock-lawdesk-v1',
      response: {
        summary: `Mock summary for matter ${matterId}`,
        risks: [],
        missing_items: [],
        // Include sample next_steps / lawyer_actions so PlannerRuntime produces proposals
        next_steps: [
          {
            action: 'assign_task',
            title: 'Assign investigator to collect bank records',
            reason: 'Bank records are missing and are critical evidence to prove the claim.',
          },
          {
            action: 'draft_document',
            title: 'Draft preservation notice',
            reason: 'Preserve electronic evidence and prevent deletion by the counterparty.',
          },
          {
            action: 'create_research',
            title: 'Search for relevant case law on data preservation',
            reason: 'Relevant case law will inform the preservation notice and litigation strategy.',
          }
        ],
        lawyer_actions: [],
      },
      generated_at: now,
    }
  }
}

export default MockLlmAdapter;
