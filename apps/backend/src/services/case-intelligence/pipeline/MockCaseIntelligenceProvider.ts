import type { CasePipelineContext, CasePipelineMaterial } from './CasePipelineContext'

export type CaseStageName = 'material' | 'identity' | 'narrative' | 'actor' | 'conflict' | 'factor' | 'risk' | 'review'

export interface CaseIntelligenceProvider {
  provide<T>(stage: CaseStageName, context: Readonly<CasePipelineContext>): Promise<T>
}

export class MockCaseIntelligenceProvider implements CaseIntelligenceProvider {
  constructor(private readonly responses: Partial<Record<CaseStageName, unknown>> = {}) {}

  async provide<T>(stage: CaseStageName, context: Readonly<CasePipelineContext>): Promise<T> {
    if (stage in this.responses) return structuredClone(this.responses[stage]) as T
    return this.defaultResponse(stage, context) as T
  }

  private defaultResponse(stage: CaseStageName, context: Readonly<CasePipelineContext>): unknown {
    switch (stage) {
      case 'material': {
        const raw = Array.isArray(context.input.context) ? context.input.context : []
        return raw.map((item: any, index): CasePipelineMaterial => ({
          id: String(item?.id || `material-${index + 1}`),
          title: String(item?.title || `材料${index + 1}`),
          content: String(item?.content || ''),
        }))
      }
      case 'identity':
        return { caseId: context.input.case_id, title: context.input.title, caseType: '待识别', stage: '待识别', jurisdiction: '待确认' }
      case 'narrative':
        return { summary: context.input.title, background: '待基于案件材料形成。', currentPosture: '待律师确认。' }
      case 'actor':
        return {
          actors: [{ id: 'actor-pending-1', name: '【待确认主体】', role: '待识别', position: '待律师确认。' }],
          timeline: [],
        }
      case 'conflict':
        return []
      case 'factor':
        return []
      case 'risk':
        return []
      case 'review':
        return { unknowns: [], selfReview: { confidence: 0, limitations: ['当前使用 Mock Provider，未进行案件分析。'], assumptions: [], requiresLawyerReview: true } }
    }
  }
}

export default MockCaseIntelligenceProvider
