import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import CaseChiefService from './CaseChiefService'
import CaseEvaluationService from './CaseEvaluationService'
import CaseModelProviderNormalizer from './CaseModelProviderNormalizer'
import CaseModelValidator from './CaseModelValidator'
import BenchmarkCaseLoader from './benchmark/BenchmarkCaseLoader'
import type {
  BenchmarkProviderArtifacts,
  BenchmarkProviderExecutionContext,
  BenchmarkProviderId,
} from './benchmark/types/benchmark.types'
import BenchmarkResultStorage from './benchmark/storage/BenchmarkResultStorage'
import type {
  CaseComparisonEvaluation,
  CaseIntelligenceInput,
  CaseModel,
} from './types/caseModel.types'

type CaseModelGenerator = {
  generateCaseModel(
    input: CaseIntelligenceInput,
    context?: BenchmarkProviderExecutionContext,
  ): Promise<CaseModel>
  artifacts?(): BenchmarkProviderArtifacts
}
type CaseModelEvaluator = Pick<CaseEvaluationService, 'compare'>

export type CaseBenchmarkDiagnosticSnapshot = {
  provider: string
  model: string
  responses: readonly unknown[]
}

export type CaseBenchmarkStorageContext = {
  storage: BenchmarkResultStorage
  runId: string
  providerId: BenchmarkProviderId
  model: string
}

export class BaseCaseModelCache {
  private readonly models = new Map<string, Promise<CaseModel>>()

  async getOrCreate(
    input: CaseIntelligenceInput,
    generator: CaseModelGenerator,
  ): Promise<CaseModel> {
    let pending = this.models.get(input.case_id)
    if (!pending) {
      pending = generator.generateCaseModel(input).then((model) => structuredClone(model))
      this.models.set(input.case_id, pending)
    }
    try {
      return structuredClone(await pending)
    } catch (error) {
      this.models.delete(input.case_id)
      throw error
    }
  }
}

export type CaseBenchmarkBaseModelContext = {
  cache: BaseCaseModelCache
  generator: CaseModelGenerator
}

export type CaseBenchmarkResult = {
  caseId: string
  caseModelPath: string
  evaluationReportPath: string
  runtimePath?: string
  rawAIResponsePath?: string
  decisionFactorReviewPath?: string
  baseCaseModelPath?: string
  afterConflictEnhancementPath?: string
  afterDecisionFactorEnhancementPath?: string
  afterReviewPath?: string
  model: CaseModel
  evaluation: CaseComparisonEvaluation
}

function defaultBenchmarkRoot() {
  const fromWorkspace = path.resolve(process.cwd(), 'test-data/case-intelligence-benchmark')
  if (existsSync(fromWorkspace)) return fromWorkspace
  return path.resolve(process.cwd(), '../../test-data/case-intelligence-benchmark')
}

export class CaseBenchmarkRunner {
  private readonly providerNormalizer = new CaseModelProviderNormalizer()
  private readonly modelValidator = new CaseModelValidator()

  constructor(
    private readonly caseChief: CaseModelGenerator = new CaseChiefService(),
    private readonly evaluator: CaseModelEvaluator = new CaseEvaluationService(),
    private readonly benchmarkRoot = defaultBenchmarkRoot(),
    private readonly diagnosticSource: () => CaseBenchmarkDiagnosticSnapshot | undefined = () => undefined,
    private readonly storageContext?: CaseBenchmarkStorageContext,
    private readonly baseModelContext?: CaseBenchmarkBaseModelContext,
  ) {}

  async run(caseId: string): Promise<CaseBenchmarkResult> {
    const normalizedCaseId = String(caseId || '').trim()
    if (!/^case-\d{3}$/.test(normalizedCaseId)) throw new Error('case_benchmark_id_invalid')

    const v2CaseDirectory = path.join(this.benchmarkRoot, 'cases', normalizedCaseId)
    const caseDirectory = existsSync(v2CaseDirectory)
      ? v2CaseDirectory
      : path.join(this.benchmarkRoot, normalizedCaseId)
    const outputDirectory = path.join(caseDirectory, 'outputs')
    const benchmarkCase = await new BenchmarkCaseLoader(this.benchmarkRoot).load(normalizedCaseId)
    const input = benchmarkCase.input
    const golden = benchmarkCase.goldenCaseModel
    let model: CaseModel
    let baseCaseModel: CaseModel | undefined
    let baseCaseModelPath: string | undefined
    const startedAt = Date.now()
    try {
      if (this.baseModelContext) {
        baseCaseModel = await this.baseModelContext.cache.getOrCreate(
          input,
          this.baseModelContext.generator,
        )
        if (this.storageContext) {
          baseCaseModelPath = await this.storageContext.storage.saveBaseCaseModel(
            this.storageContext.runId,
            normalizedCaseId,
            baseCaseModel,
          )
        }
      }
      const providerModel = await this.caseChief.generateCaseModel(input, { baseCaseModel })
      model = this.providerNormalizer.normalize(providerModel)
      const validation = this.modelValidator.validate(model)
      if (!validation.ok) {
        const error = new Error('case_model_invalid')
        ;(error as any).code = 'case_model_invalid'
        ;(error as any).failingStage = 'case_model'
        ;(error as any).validation = validation
        throw error
      }
    } catch (caught) {
      const error = caught instanceof Error ? caught : new Error(String(caught))
      const details = error as any
      const snapshot = this.diagnosticSource()
      const rawResponse = snapshot || (details.rawAIResponse !== undefined
        ? { provider: details.provider, model: details.model, responses: [details.rawAIResponse] }
        : undefined)
      let rawAIResponsePath: string | null = null
      if (rawResponse) {
        if (this.storageContext) {
          rawAIResponsePath = await this.storageContext.storage.saveRawAIResponse(
            this.storageContext.runId,
            normalizedCaseId,
            this.storageContext.providerId,
            rawResponse,
          )
        } else {
          await mkdir(outputDirectory, { recursive: true })
          rawAIResponsePath = path.join(outputDirectory, 'raw-ai-response.json')
          await writeFile(rawAIResponsePath, `${JSON.stringify(rawResponse, null, 2)}\n`, 'utf8')
        }
      }
      if (this.storageContext) {
        const artifacts = this.caseChief.artifacts?.() || {}
        await this.storageContext.storage.saveEnhancementArtifacts(
          this.storageContext.runId,
          normalizedCaseId,
          this.storageContext.providerId,
          artifacts,
        )
      }
      details.benchmarkDiagnostic = {
        failing_stage: details.failingStage || 'case_model',
        schema_validation_error: details.validation || details.schemaValidationError || { code: details.code || error.message },
        raw_ai_response_path: rawAIResponsePath,
        provider: snapshot?.provider || details.provider || 'unknown',
        model: snapshot?.model || details.model || 'unknown',
      }
      throw error
    }
    const evaluation = this.evaluator.compare(model, golden)
    const diagnosticSnapshot = this.diagnosticSource()
    const artifacts = this.caseChief.artifacts?.() || {}

    if (this.storageContext) {
      const paths = await this.storageContext.storage.save({
        runId: this.storageContext.runId,
        caseId: normalizedCaseId,
        providerId: this.storageContext.providerId,
        caseModel: model,
        evaluation,
        runtime: {
          model: this.storageContext.model,
          durationMs: Date.now() - startedAt,
          completedAt: new Date().toISOString(),
        },
        ...(diagnosticSnapshot ? { rawAIResponse: diagnosticSnapshot } : {}),
        ...artifacts,
      })
      return {
        caseId: normalizedCaseId,
        ...paths,
        ...(baseCaseModelPath ? { baseCaseModelPath } : {}),
        model,
        evaluation,
      }
    }

    const caseModelPath = path.join(outputDirectory, 'case-model.json')
    const evaluationReportPath = path.join(outputDirectory, 'evaluation-report.json')

    await mkdir(outputDirectory, { recursive: true })
    await writeFile(caseModelPath, `${JSON.stringify(model, null, 2)}\n`, 'utf8')
    await writeFile(evaluationReportPath, `${JSON.stringify(evaluation, null, 2)}\n`, 'utf8')

    return { caseId: normalizedCaseId, caseModelPath, evaluationReportPath, model, evaluation }
  }
}

export default CaseBenchmarkRunner
