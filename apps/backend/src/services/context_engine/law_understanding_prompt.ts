import type { CaseUnderstandingResult } from './case_understanding_schema'

export const LAW_UNDERSTANDING_PROMPT_VERSION = 'law-understanding-v1' as const

export type LawUnderstandingIssueScope = {
  issue: {
    issueId: string
    title: string
    description: string
    priority: string
    status: string
  }
  facts: Array<{
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
  }>
}

export function buildLawUnderstandingPrompt(
  matterId: string,
  caseUnderstanding: CaseUnderstandingResult,
  scopes: LawUnderstandingIssueScope[],
) {
  return [
    `任务：为 Matter ${matterId} 生成待律师审核的 Law Draft。`,
    '你是 LawDesk Law Understanding Assistant。必须按每个独立 Issue Scope 审查法律依据。',
    'Case Understanding 只用于案件定位、主体消歧和防止法律关系偏离，不是 Law、Fact 或 Evidence 来源。',
    '每个 Scope 严格按照 Issue → Fact → Evidence → Material 正文组织。不得使用其他 Scope 的 Fact、Evidence 或 Material。',
    'Formal Issue 是 Law 的唯一业务入口；Fact 限定适用规则所依赖的事实边界；Evidence 和 Material 正文仅用于核验这些事实边界。',
    '不得根据案件类型、法律经验或常见抗辩补充 Scope 中不存在的交易、履行行为、金额、责任主体或法律关系。',
    '每条 Law Draft 必须且只能引用一个输入中的 issueId。无法可靠确认法律依据、规范名称或条号时不得猜测，可以少返回或返回空数组。',
    'rule_content 只陈述抽象法律规则；application 使用“用于审查”“需要结合”“可能适用”等审查性表达，不得作出本案责任、胜负或请求是否应获支持的结论。',
    'citation 必须写明完整规范名称和明确条号；禁止占位符。同一 Issue 最多返回两条 citation 不重复的 Law。',
    '只输出合法 JSON，不得输出 Markdown、代码块、解释或额外字段。',
    '输出结构：',
    JSON.stringify({
      law_drafts: [{
        title: '非空字符串',
        citation: '完整规范名称及明确条号',
        rule_content: '抽象法律规则',
        application: '与对应 Issue 的审查关系',
        limitations: '适用条件、例外和律师核验边界',
        jurisdiction: '中国大陆',
        source_reference: '规范或权威来源',
        confidence: 0.8,
        ai_reasoning: '该规则与对应 Issue Scope 的关系',
        source_issue_ids: ['输入中的唯一 issueId'],
      }],
    }, null, 2),
    `CASE_UNDERSTANDING:\n${JSON.stringify(caseUnderstanding, null, 2)}`,
    `ISSUE_SCOPES:\n${JSON.stringify(scopes, null, 2)}`,
  ].join('\n\n')
}

