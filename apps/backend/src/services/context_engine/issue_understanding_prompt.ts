import type { CaseUnderstandingResult } from './case_understanding_schema'

export const ISSUE_UNDERSTANDING_PROMPT_VERSION = 'issue-understanding-v1' as const

export type IssueUnderstandingFactInput = {
  factId: string
  title: string
  description: string
  status: string
  evidenceSources: Array<{
    evidenceId: string
    title: string
    description: string
    relevance: string
    evidenceType: string
    material: {
      materialId: string
      title: string
      materialType: string
      source: string
      content: string
    }
  }>
}

export function buildIssueUnderstandingPrompt(
  matterId: string,
  caseUnderstanding: CaseUnderstandingResult,
  facts: IssueUnderstandingFactInput[],
) {
  return [
    `任务：为 Matter ${matterId} 生成待律师审核的 Issue Draft。`,
    '你是 LawDesk Issue Understanding Assistant。必须同时阅读当前案件理解、正式 Facts、FactEvidence 关系、Formal Evidence 和 Evidence 对应的 Material 正文。',
    'Case Understanding 仅用于案件定位、主体消歧和识别案件主线，不是 Issue 的事实来源。Issue 必须建立在输入的 Formal Facts 上。',
    'Evidence 和 Material 正文用于核验 Formal Fact 的来源与语义边界，不得绕过 Formal Fact 直接创造新的事实前提。',
    '不得根据案件类型、法律经验或常见抗辩补充输入中不存在的交易、履行行为、金额、责任主体或法律关系。',
    '每条 Issue Draft 必须引用至少一个具有 Evidence 和 Material 正文支持的真实 factId；禁止引用其他 Matter、Fact Draft、Case Understanding 或不存在的 Fact。',
    'Issue 是待律师审查的开放问题，不是事实复述或最终结论。不得直接认定责任成立、合同效力、请求应获支持、证据充分或一方胜败。',
    'title、description 和 ai_reasoning 中的每个事实前提必须能够在所引 Formal Facts 中找到依据。最多输出 5 条核心 Issue。',
    '只输出合法 JSON，不得输出 Markdown、代码块、解释或额外字段。',
    '输出结构：',
    JSON.stringify({
      issue_drafts: [{
        title: '非空字符串',
        description: '说明该问题为何需要律师审查，不给出最终结论',
        source_fact_ids: ['输入中的 factId'],
        confidence: 0.8,
        ai_reasoning: '说明该 Issue 与所引 Formal Facts 的关系',
      }],
    }, null, 2),
    `CASE_UNDERSTANDING:\n${JSON.stringify(caseUnderstanding, null, 2)}`,
    `FORMAL_FACTS_WITH_EVIDENCE_AND_MATERIALS:\n${JSON.stringify(facts, null, 2)}`,
  ].join('\n\n')
}

