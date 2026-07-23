import CaseModelValidator from '../CaseModelValidator'
import type { CaseIntelligenceInput, CaseModel } from '../types/caseModel.types'
import GovernanceService from './GovernanceService'
import InitialReader from './InitialReader'

type InitialUnderstandingReader = Pick<InitialReader, 'read'>
type CaseModelGovernance = Pick<GovernanceService, 'generate'>

export class HybridCaseIntelligenceProvider {
  constructor(
    private readonly initialReader: InitialUnderstandingReader = new InitialReader(),
    private readonly governance: CaseModelGovernance = new GovernanceService(),
    private readonly validator = new CaseModelValidator(),
  ) {}

  async generateCaseModel(input: CaseIntelligenceInput): Promise<CaseModel> {
    const understanding = await this.initialReader.read(input)
    const model = this.governance.generate(input, understanding)
    const validation = this.validator.validate(model, { sourceText: JSON.stringify(input.context) })
    if (!validation.ok) {
      const error = new Error('hybrid_case_model_validation_failed')
      ;(error as any).code = 'hybrid_case_model_validation_failed'
      ;(error as any).failingStage = 'governance'
      ;(error as any).schemaValidationError = validation
      throw error
    }
    return model
  }
}

export default HybridCaseIntelligenceProvider
