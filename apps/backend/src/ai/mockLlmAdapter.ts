import type LlmAdapter from './llmAdapter';
import { createAIAudit } from '../services/ai/aiAudit';
import { buildDeterministicIssueSuggestions } from '../services/ai/legalConceptClassifier';
import { ISSUE_CONCEPT_ORDER, type IssueConcept } from '../services/ai/legalConceptClassifier';
import { buildDeterministicLawCandidates } from '../services/ai/legalRuleClassifier';

const ARGUMENT_TEMPLATES: Record<IssueConcept, { title: string; position: string; reasoning: string; conclusion: string; counter_argument: string; response: string; risk: string }> = {
  agreement: {
    title: '借贷关系及合同成立论证',
    position: '正式事实与法律规则共同支持借贷合意形成及合同成立。',
    reasoning: '借条、聊天记录等正式来源能够反映当事人的借贷合意，并与民间借贷关系及合同成立规则相互对应，形成从事实基础到法律评价的完整论证。',
    conclusion: '现有证据支持民间借贷关系成立的判断，但仍需律师对借条、聊天记录及真实意思表示作最终审核。',
    counter_argument: '对方可能否认存在真实借贷合意或主张相关意思表示不完整。',
    response: '应以已确认的合意事实和对应合同成立规则说明真实意思表示及法律关系基础。',
    risk: '相关日期需要核验，利息计算需要确认，借条、聊天记录等证据真实性需要律师审核。',
  },
  delivery: {
    title: '借款资金实际交付论证',
    position: '正式事实与法律规则共同支持借款资金已经实际交付。',
    reasoning: '银行流水、转账记录等正式来源能够证明借款资金交付，并与资金交付及举证规则相互对应，说明出借义务已经履行。',
    conclusion: '现有银行流水和转账记录支持出借义务履行的判断，但证据真实性及款项性质仍需律师最终审核。',
    counter_argument: '对方可能否认款项性质或主张资金流转与借贷关系无关。',
    response: '应结合已确认的资金流转事实和交付举证规则说明付款主体、收款主体及款项性质。',
    risk: '相关日期需要核验，利息计算需要确认，银行流水、转账记录等证据真实性需要律师审核。',
  },
  default: {
    title: '到期未履行及违约责任论证',
    position: '正式事实与法律规则共同支持债务到期未履行及相应违约责任。',
    reasoning: '正式来源反映债务已经到期、借款人仍未还款且已经进行催收，并可结合违约责任及利息规则形成责任认定基础。',
    conclusion: '现有到期、未还款及催收事实支持违约责任主张，同时保留律师对到期时间、利息及证据的最终确认。',
    counter_argument: '对方可能主张债务未到期、已经清偿或利息约定不受保护。',
    response: '应以正式到期和未履行事实结合违约及利息规则逐项回应。',
    risk: '相关日期需要核验，实际还款情况和利息计算需要律师确认，催收等证据真实性需要审核。',
  },
}

function buildMockArguments(input: { facts?: any[]; issues?: any[]; laws?: any[] }) {
  const facts = Array.isArray(input.facts) ? input.facts : []
  const issues = Array.isArray(input.issues) ? input.issues : []
  const laws = Array.isArray(input.laws) ? input.laws : []
  return ISSUE_CONCEPT_ORDER.flatMap((issueType) => {
    const typedIssues = issues.filter((issue) => issue?.issue_type === issueType)
    const sourceIssueIds = Array.from(new Set(typedIssues.map((issue) => String(issue.issue_id || '').trim()).filter(Boolean))).sort()
    const linkedFactIds = new Set(typedIssues.flatMap((issue) => Array.isArray(issue.source_fact_ids) ? issue.source_fact_ids.map(String) : []))
    const sourceFactIds = Array.from(new Set(facts
      .filter((fact) => fact?.issue_type === issueType && linkedFactIds.has(String(fact.fact_id)))
      .map((fact) => String(fact.fact_id || '').trim()).filter(Boolean))).sort()
    const sourceLawIds = Array.from(new Set(laws
      .filter((law) => law?.issue_type === issueType && Array.isArray(law.source_issue_ids) && law.source_issue_ids.some((id: unknown) => sourceIssueIds.includes(String(id))))
      .map((law) => String(law.law_id || '').trim()).filter(Boolean))).sort()
    if (sourceFactIds.length === 0 || sourceIssueIds.length === 0 || sourceLawIds.length === 0) return []
    const template = ARGUMENT_TEMPLATES[issueType]
    return [{
      ...template,
      issue_type: issueType,
      risk_note: template.risk,
      description: template.reasoning,
      source_fact_ids: sourceFactIds,
      source_issue_ids: sourceIssueIds,
      source_law_ids: sourceLawIds,
      fact_titles: sourceFactIds,
      issue_title: template.title,
      law_citations: sourceLawIds,
      confidence: 0.9,
      ai_reasoning: `基于已发布的 ${issueType} 类型正式来源生成。`,
    }]
  })
}

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
    const promptVersion = typeof promptPack.prompt_version === 'string' && promptPack.prompt_version.trim()
      ? promptPack.prompt_version.trim()
      : 'legacy-ai-v1'
    const aiAudit = createAIAudit('mock', 'mock-lawdesk-v1', promptVersion)
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
          prompt_version: promptVersion,
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
        prompt_version: promptVersion,
        ai_audit: aiAudit,
      }
    }

    if (promptPack.task === 'analyze_issues') {
      const issues = buildDeterministicIssueSuggestions(Array.isArray(promptPack.facts) ? promptPack.facts : [])
      await logSafeMetadata()
      return {
        matter_id: matterId,
        provider: 'mock',
        model: 'mock-lawdesk-v1',
        response: { issues },
        generated_at: now,
        fallback: false,
        fallback_used: false,
        prompt_version: promptVersion,
        ai_audit: aiAudit,
      }
    }

    if (promptPack.task === 'analyze_laws') {
      const laws = buildDeterministicLawCandidates(Array.isArray(promptPack.issues) ? promptPack.issues : [])
      await logSafeMetadata()
      return {
        matter_id: matterId,
        provider: 'mock',
        model: 'mock-lawdesk-v1',
        response: { laws },
        generated_at: now,
        fallback: false,
        fallback_used: false,
        prompt_version: promptVersion,
        ai_audit: aiAudit,
      }
    }

    if (promptPack.task === 'analyze_arguments') {
      const argumentsList = buildMockArguments({ facts: promptPack.facts, issues: promptPack.issues, laws: promptPack.laws })
      await logSafeMetadata()
      return {
        matter_id: matterId,
        provider: 'mock',
        model: 'mock-lawdesk-v1',
        response: { arguments: argumentsList },
        generated_at: now,
        fallback: false,
        fallback_used: false,
        prompt_version: promptVersion,
        ai_audit: aiAudit,
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
      prompt_version: promptVersion,
      ai_audit: aiAudit,
    }
  }
}

export default MockLlmAdapter;
