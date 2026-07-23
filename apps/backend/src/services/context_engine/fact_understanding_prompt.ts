import type { CaseUnderstandingResult } from './case_understanding_schema'

export const FACT_UNDERSTANDING_PROMPT_VERSION = 'fact-understanding-v1' as const

export type FactUnderstandingEvidenceInput = {
  evidenceId: string
  title: string
  description: string
  relevance: string
  evidenceType: string
  status: string
  material: {
    materialId: string
    title: string
    materialType: string
    source: string
    content: string
  }
}

export function buildFactUnderstandingPrompt(
  matterId: string,
  caseUnderstanding: CaseUnderstandingResult,
  evidences: FactUnderstandingEvidenceInput[],
) {
  return [
    `任务：为 Matter ${matterId} 生成待律师审核的 Fact Draft。`,
    '你是 LawDesk Fact Understanding Assistant。必须同时阅读当前案件理解、律师已确认的 Formal Evidence，以及每项 Evidence 对应的 Material 正文。',
    'Case Understanding 只用于案件定位、主体消歧和理解争议，不是事实来源。Formal Evidence 及其对应 Material 正文才是 Fact 来源。',
    '不得把 Case Understanding 的 narrative、timeline、conflicts 或 unknowns 直接改写为事实。',
    '不得仅根据 Evidence 标题、证明目的、案件类型或法律经验推测事实；Evidence 描述与 Material 正文冲突时，以 Material 正文为核验基础，并不得生成 confirmed 事实。',
    '不得生成 Material 正文中未明确记载的任何事实，不得引入与当前材料无关的交易、金额、履行行为或法律关系。不得把争议事项写成已经确认的事实。',
    '每条 Fact Draft 必须引用至少一个输入中真实存在的 evidence_id；禁止引用其他 Matter、Evidence Draft、Case Understanding 或不存在的 Evidence。',
    'category 只能使用 confirmed、to_prove、disputed。confirmed 必须有 Material 正文直接支持；证据不足时使用 to_prove 或 disputed。',
    'title 和 description 必须是可观察、可核验的客观事实，不得输出法律评价、责任结论或证明力结论。最多输出 8 条核心事实。',
    '只输出合法 JSON，不得输出 Markdown、代码块、解释或额外字段。',
    '输出结构：',
    JSON.stringify({
      fact_drafts: [{
        title: '非空字符串',
        description: '非空字符串',
        category: 'confirmed | to_prove | disputed',
        source_evidence_ids: ['输入中的 evidence_id'],
        confidence: 0.8,
        ai_reasoning: '说明 Evidence 与 Material 正文如何支持该事实',
      }],
    }, null, 2),
    `CASE_UNDERSTANDING:\n${JSON.stringify(caseUnderstanding, null, 2)}`,
    `FORMAL_EVIDENCE_AND_SOURCE_MATERIALS:\n${JSON.stringify(evidences, null, 2)}`,
  ].join('\n\n')
}
