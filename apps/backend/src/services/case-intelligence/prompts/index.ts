import type { CaseIntelligenceInput } from '../types/caseModel.types'
import type { CasePipelineContext } from '../pipeline/CasePipelineContext'
import type { CaseStageName } from '../pipeline/MockCaseIntelligenceProvider'

export type CaseIntelligencePrompt = {
  prompt_version: string
  task: 'build_case_model'
  input: CaseIntelligenceInput
}

export function buildCaseIntelligencePrompt(input: CaseIntelligenceInput): CaseIntelligencePrompt {
  return {
    prompt_version: 'case-model-v1',
    task: 'build_case_model',
    input,
  }
}

const STAGE_OUTPUT_SHAPES: Record<CaseStageName, string> = {
  material: '[{"id":"","title":"","content":""}]',
  identity: '{"caseId":"","title":"","caseType":"","stage":"","jurisdiction":""}',
  narrative: '{"summary":"","background":"","currentPosture":""}',
  actor: '{"actors":[{"id":"","name":"","role":"","position":""}],"timeline":[{"id":"","date":"","event":"","actorIds":[],"certainty":"confirmed|disputed|unknown"}]}',
  conflict: '[{"id":"","title":"","description":"","actorIds":[]}]',
  factor: '[{"id":"","label":"","description":"","impact":"supportive|adverse|neutral|uncertain"}]',
  risk: '[{"id":"","description":"","severity":"low|medium|high","mitigation":""}]',
  review: '{"unknowns":[{"id":"","question":"","importance":"low|medium|high"}],"selfReview":{"confidence":0,"limitations":[],"assumptions":[],"requiresLawyerReview":true}}',
}

export function buildCaseStagePrompt(stage: CaseStageName, context: Readonly<CasePipelineContext>, compactRetry = false) {
  return `你是 LawDesk 案件认知层助手。只处理当前 ${stage} 阶段，不生成 Fact、Issue、Law 或 Document。

CASE_PIPELINE_CONTEXT:
${JSON.stringify(context)}

输出要求：
1. 只输出合法 JSON，不得输出 Markdown、代码块或解释。
2. 输出必须严格符合以下结构：${STAGE_OUTPUT_SHAPES[stage]}
3. 不得虚构输入中不存在的主体、时间、行为或关系。
4. 不确定内容保留为空、unknown 或交由 selfReview 标记。
5. 当前输出将接受结构校验。${compactRetry ? '\n6. 这是唯一一次重试：使用最短完整 JSON，删除一切解释性文字。' : ''}`
}
