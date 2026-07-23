import type { CaseUnderstandingResult } from './case_understanding_schema'
import type { MinimalContextMaterial } from './context_types'
import { EVIDENCE_DRAFT_CONTRACT_VERSION, EVIDENCE_DRAFT_SCHEMA_V2 } from './evidence_draft_schema'

export const EVIDENCE_UNDERSTANDING_PROMPT_VERSION = 'evidence-understanding-v2' as const

export function buildEvidenceUnderstandingPrompt(
  matterId: string,
  caseUnderstanding: CaseUnderstandingResult,
  materials: MinimalContextMaterial[],
) {
  return [
    `任务：为 Matter ${matterId} 生成符合 ${EVIDENCE_DRAFT_CONTRACT_VERSION}、待律师审核的 Evidence Draft。`,
    '你是 LawDesk Evidence Understanding Assistant。必须同时阅读当前案件理解和当前 Matter 的真实材料正文。',
    'Case Understanding 只用于理解案件背景、主体、案件类型、主线和争议，不是 Evidence 来源。Material 正文才是 Evidence 来源。',
    '禁止根据案件类型猜测证据，禁止根据法律经验创造不存在的文件，禁止把争议事项当成已经证明的事实，禁止把 Case Understanding narrative 当成证据。',
    '不得生成 MATERIALS 中不存在的合同、付款、交付、催收、违约或其他事实。材料不存在时不得生成 Evidence Draft；可以识别为“建议补充”，但不得放入 evidence_drafts。',
    '每条 Draft 必须引用至少一份 MATERIALS 中真实存在的 material_id；禁止引用其他 Matter 或不存在的材料。',
    'title 必须是律师可读的证据名称，不得简单复制文件名、编号、扩展名或追加“证据”。例如“03_设备采购销售合同.pdf”应写为“设备采购销售合同”。',
    'proof_purpose 必须明确该材料具体证明什么，不得写“证明案件事实”“证明相关事实”等泛化表达。',
    'proof_relationship 必须说明该材料与当前案件核心争议或待证事实的关系。',
    'legal_use 必须说明律师如何使用该材料，例如证明合同成立、卖方履行交付义务或支持尾款请求；不得超出材料正文。',
    'importance 只能使用 critical、important、supporting；suggested_action 只能使用 confirm_as_evidence。',
    'title、proof_purpose、proof_relationship、legal_use、summary、reasoning 均不得为空。材料不足以支持具体结论时，proof_purpose 应保守表述为“用于核验该材料所记载事项，具体证明目的待律师确认”。',
    '只输出合法 JSON，不得输出 Markdown、代码块或解释。',
    `JSON_SCHEMA:\n${JSON.stringify(EVIDENCE_DRAFT_SCHEMA_V2)}`,
    `CASE_UNDERSTANDING:\n${JSON.stringify(caseUnderstanding, null, 2)}`,
    `MATERIALS:\n${JSON.stringify(materials.map((material) => ({
      material_id: material.materialId,
      title: material.title,
      material_type: material.materialType,
      source: material.source,
      content: material.content,
    })), null, 2)}`,
  ].join('\n\n')
}
