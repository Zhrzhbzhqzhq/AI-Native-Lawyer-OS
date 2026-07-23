import type {
  CaseComparisonEvaluation,
  CaseIntelligenceInput,
  CaseModel,
} from '../../types/caseModel.types'
import type { DecisionFactorEvidenceReview } from '../../enhancement/DecisionFactorEvidenceReviewer'
import type { DecisionFactorGroundingWarning } from '../../enhancement/DecisionFactorGroundingNormalizer'

export const BENCHMARK_PROVIDER_IDS = [
  'mock',
  'minimax',
  'direct-minimax',
  'enhanced-minimax',
  'enhanced-v2-minimax',
  'enhanced-v3-minimax',
  'enhanced-v4-minimax',
  'hybrid-minimax',
] as const

export type BenchmarkProviderId = typeof BENCHMARK_PROVIDER_IDS[number]

export type BenchmarkProvider = {
  readonly id: BenchmarkProviderId
  readonly model: string
  readonly usesDirectBase?: boolean
  generateCaseModel(
    input: CaseIntelligenceInput,
    context?: BenchmarkProviderExecutionContext,
  ): Promise<CaseModel>
  diagnostics?(): BenchmarkProviderDiagnostics
  artifacts?(): BenchmarkProviderArtifacts
}

export type BenchmarkProviderExecutionContext = {
  readonly baseCaseModel?: CaseModel
}

export type BenchmarkProviderArtifacts = {
  readonly decisionFactorReview?: readonly DecisionFactorEvidenceReview[]
  readonly decisionFactorGroundingWarnings?: readonly DecisionFactorGroundingWarning[]
  readonly afterConflictEnhancement?: CaseModel
  readonly afterDecisionFactorEnhancement?: CaseModel
  readonly afterReview?: CaseModel
}

export type BenchmarkProviderDiagnostics = {
  readonly provider: string
  readonly model: string
  readonly responses: readonly unknown[]
}

export type BenchmarkCase = {
  readonly caseId: string
  readonly input: CaseIntelligenceInput
  readonly goldenCaseModel: CaseModel
}

export type BenchmarkManifest = {
  readonly version: '1.0'
  readonly cases: readonly string[]
}

export type BenchmarkMatrixRequest = {
  readonly caseIds: readonly string[]
  readonly providerIds?: readonly BenchmarkProviderId[]
}

export type BenchmarkProviderSuccess = {
  readonly status: 'completed'
  readonly providerId: BenchmarkProviderId
  readonly model: string
  readonly durationMs: number
  readonly caseModel: CaseModel
  readonly evaluation: CaseComparisonEvaluation
}

export type BenchmarkProviderFailure = {
  readonly status: 'failed'
  readonly providerId: BenchmarkProviderId
  readonly model: string
  readonly durationMs: number
  readonly error: BenchmarkRunError
}

export type BenchmarkRunError = {
  readonly code: string
  readonly message: string
  readonly stage?: string
  readonly details?: unknown
}

export type BenchmarkProviderResult = BenchmarkProviderSuccess | BenchmarkProviderFailure

export type BenchmarkRuntime = {
  readonly model: string
  readonly durationMs: number
  readonly completedAt: string
  readonly metadata?: Readonly<Record<string, unknown>>
}

export type BenchmarkRunResult = {
  readonly runId: string
  readonly caseId: string
  readonly providerId: BenchmarkProviderId
  readonly caseModel: CaseModel
  readonly evaluation: CaseComparisonEvaluation
  readonly runtime: BenchmarkRuntime
  readonly rawAIResponse?: unknown
  readonly decisionFactorReview?: readonly DecisionFactorEvidenceReview[]
  readonly afterConflictEnhancement?: CaseModel
  readonly afterDecisionFactorEnhancement?: CaseModel
  readonly afterReview?: CaseModel
}

export type BenchmarkResultPaths = {
  readonly baseCaseModelPath?: string
  readonly caseModelPath: string
  readonly evaluationReportPath: string
  readonly runtimePath: string
  readonly rawAIResponsePath?: string
  readonly decisionFactorReviewPath?: string
  readonly afterConflictEnhancementPath?: string
  readonly afterDecisionFactorEnhancementPath?: string
  readonly afterReviewPath?: string
}

export type BenchmarkCaseResult = {
  readonly caseId: string
  readonly providers: readonly BenchmarkProviderResult[]
}

export type BenchmarkProviderSummary = {
  readonly providerId: BenchmarkProviderId
  readonly completedCases: number
  readonly failedCases: number
  readonly averageScore: number | null
  readonly averageDurationMs: number | null
}

export type BenchmarkMatrixReport = {
  readonly schemaVersion: '2.0'
  readonly generatedAt: string
  readonly providerIds: readonly BenchmarkProviderId[]
  readonly cases: readonly BenchmarkCaseResult[]
  readonly summary: readonly BenchmarkProviderSummary[]
}

export type BenchmarkReportFormat = 'json' | 'markdown'

export type BenchmarkReportRequest = {
  readonly report: BenchmarkMatrixReport
  readonly format: BenchmarkReportFormat
  readonly outputDirectory?: string
}

export type BenchmarkReportArtifact = {
  readonly format: BenchmarkReportFormat
  readonly content: string
  readonly outputPath?: string
}
