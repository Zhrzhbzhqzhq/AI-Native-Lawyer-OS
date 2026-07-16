import type LlmAdapter from './llmAdapter';

export class MockLlmAdapter implements LlmAdapter {
  async generate(promptPack: any): Promise<any> {
    const environment = (process.env.NODE_ENV || 'development').toLowerCase()
    if (environment === 'production') throw new Error('ai_provider_mock_forbidden_in_production')
    if (environment !== 'test' && String(process.env.AI_PROVIDER || '').toLowerCase() !== 'mock') {
      throw new Error('ai_provider_mock_not_explicitly_enabled')
    }

    const startedAt = Date.now()
    const matterId = promptPack.matter_id ?? (promptPack.context_pack?.matter?.matter_id ?? 'unknown')
    const now = new Date().toISOString()
    const logSafeMetadata = async () => {
      try {
        const { logAIRequest } = await import('../services/ai/aiRuntimeLogger')
        logAIRequest({
          provider: 'mock',
          model: 'mock-lawdesk-v1',
          matter_id: matterId,
          workspace: promptPack.task,
          duration_ms: Date.now() - startedAt,
          prompt_tokens: null,
          completion_tokens: null,
          retry: 0,
          cost: null,
          fallback: false,
          prompt_version: process.env.PROMPT_VERSION || 'v1',
        })
      } catch (_e) {
        // ignore logging errors
      }
    }

    if (promptPack.task === 'prompt_runner_document') {
      await logSafeMetadata()
      return {
        matter_id: matterId,
        provider: 'mock',
        model: 'mock-lawdesk-v1',
        response: JSON.stringify([
          {
            title: '通用法律文书草稿',
            document_type: 'general_legal_document',
            content: [
              '本文件为本地测试环境生成的通用法律文书草稿。',
              '文书内容应由律师结合案件事实、证据材料和适用法律进行最终审核确认。',
              '确认前不得直接用于提交、送达或对外出具。'
            ].join('\n'),
          },
        ]),
        generated_at: now,
        fallback: false,
        fallback_used: false,
      }
    }

    // Provide deterministic sample actions for UI/testing purposes
    await logSafeMetadata()
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
      fallback: false,
      fallback_used: false,
    }
  }
}

export default MockLlmAdapter;
