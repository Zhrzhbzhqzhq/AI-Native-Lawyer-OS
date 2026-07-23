import CaseEvaluationService from './CaseEvaluationService'
import CaseModelValidator from './CaseModelValidator'
import { CaseChiefPipeline, type CaseIntelligencePipeline } from './pipeline'
import type { CaseIntelligenceInput, CaseIntelligenceResult, CaseModel } from './types/caseModel.types'

export class CaseChiefService {
  constructor(
    private readonly pipeline: CaseIntelligencePipeline = new CaseChiefPipeline(),
    private readonly validator = new CaseModelValidator(),
    private readonly evaluator = new CaseEvaluationService(),
  ) {}

  async generateCaseModel(input: CaseIntelligenceInput): Promise<CaseModel> {
    const model = await this.pipeline.buildModel(input)
    this.assertValidModel(model)
    return model
  }

  async buildCaseIntelligence(input: CaseIntelligenceInput): Promise<CaseIntelligenceResult> {
    const model = await this.generateCaseModel(input)
    const validation = this.validator.validate(model)
    return {
      model,
      validation,
      evaluation: this.evaluator.evaluate(model),
    }
  }

  private assertValidModel(model: CaseModel) {
    const validation = this.validator.validate(model)
    if (validation.ok) return
    const error = new Error('case_model_invalid')
    ;(error as any).code = 'case_model_invalid'
    ;(error as any).validation = validation
    throw error
  }
}

export default CaseChiefService
