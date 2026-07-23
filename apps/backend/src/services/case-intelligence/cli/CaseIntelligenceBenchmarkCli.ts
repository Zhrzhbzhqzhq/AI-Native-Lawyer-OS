import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import CaseBenchmarkRunner, {
  BaseCaseModelCache,
  type CaseBenchmarkResult,
} from '../CaseBenchmarkRunner'
import CaseEvaluationService from '../CaseEvaluationService'
import { bootstrapBenchmarkProviders } from '../benchmark/ProviderBootstrap'
import type ProviderRegistry from '../benchmark/ProviderRegistry'
import BenchmarkResultStorage from '../benchmark/storage/BenchmarkResultStorage'
import {
  BENCHMARK_PROVIDER_IDS,
  type BenchmarkProviderId,
} from '../benchmark/types/benchmark.types'

export type CaseBenchmarkProviderName = BenchmarkProviderId

export type CaseBenchmarkCliOptions = {
  caseId: string
  provider: CaseBenchmarkProviderName
} | {
  caseId: string
  all: true
}

type BenchmarkRunner = { run(caseId: string): Promise<CaseBenchmarkResult> }

export type CaseBenchmarkFailureResult = {
  caseId: string
  provider: CaseBenchmarkProviderName
  status: 'failed'
  error: {
    code: string
    message: string
  }
  failing_stage: string
  diagnostic: unknown
  errorPath: string
}

function isFailureResult(
  result: CaseBenchmarkResult | CaseBenchmarkFailureResult,
): result is CaseBenchmarkFailureResult {
  return 'status' in result && result.status === 'failed'
}

export function parseCaseBenchmarkArgs(args: string[]): CaseBenchmarkCliOptions {
  let caseId = ''
  let provider: CaseBenchmarkProviderName = 'mock'
  let providerSpecified = false
  let all = false

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--') {
      continue
    } else if (argument === '--provider') {
      const value = args[index + 1]
      if (!value) throw new Error('case_benchmark_provider_required')
      provider = parseProvider(value)
      providerSpecified = true
      index += 1
    } else if (argument.startsWith('--provider=')) {
      provider = parseProvider(argument.slice('--provider='.length))
      providerSpecified = true
    } else if (argument === '--all') {
      all = true
    } else if (argument.startsWith('-')) {
      throw new Error(`case_benchmark_unknown_option:${argument}`)
    } else if (!caseId) {
      caseId = argument
    } else {
      throw new Error(`case_benchmark_unexpected_argument:${argument}`)
    }
  }

  if (!caseId) throw new Error('case_benchmark_case_id_required')
  if (all && providerSpecified) throw new Error('case_benchmark_provider_mode_conflict')
  if (all) return { caseId, all: true }
  return { caseId, provider }
}

function parseProvider(value: string): CaseBenchmarkProviderName {
  if ((BENCHMARK_PROVIDER_IDS as readonly string[]).includes(value)) {
    return value as CaseBenchmarkProviderName
  }
  throw new Error(`case_benchmark_provider_unsupported:${value}`)
}

function createRunner(
  providerName: CaseBenchmarkProviderName,
  registry: ProviderRegistry,
  storage: BenchmarkResultStorage,
  runId: string,
  baseCaseModelCache: BaseCaseModelCache,
  benchmarkRoot?: string,
): BenchmarkRunner {
  const provider = registry.get(providerName)
  return new CaseBenchmarkRunner(
    provider,
    new CaseEvaluationService(),
    benchmarkRoot,
    provider.diagnostics,
    { storage, runId, providerId: provider.id, model: provider.model },
    provider.usesDirectBase
      ? { cache: baseCaseModelCache, generator: registry.get('direct-minimax') }
      : undefined,
  )
}

export function formatCaseBenchmarkError(error: unknown) {
  const value = error as any
  return JSON.stringify({
    error: error instanceof Error ? error.message : String(error),
    ...(value?.benchmarkDiagnostic || {}),
  }, null, 2)
}

export async function runCaseIntelligenceBenchmarkCli(
  args: string[],
  dependencies: {
    runnerFactory?: (provider: CaseBenchmarkProviderName) => BenchmarkRunner
    registry?: ProviderRegistry
    storage?: BenchmarkResultStorage
    runIdFactory?: () => string
    benchmarkRoot?: string
    write?: (text: string) => void
  } = {},
) {
  const options = parseCaseBenchmarkArgs(args)
  const registry = dependencies.registry || bootstrapBenchmarkProviders()
  const storage = dependencies.storage || new BenchmarkResultStorage()
  const runId = (dependencies.runIdFactory || randomUUID)()
  const baseCaseModelCache = new BaseCaseModelCache()
  const runnerFactory = dependencies.runnerFactory
    || ((providerName: CaseBenchmarkProviderName) => createRunner(
      providerName,
      registry,
      storage,
      runId,
      baseCaseModelCache,
      dependencies.benchmarkRoot,
    ))
  const providerNames = 'all' in options
    ? registry.list().map((provider) => provider.id)
    : [options.provider]
  const results: Array<CaseBenchmarkResult | CaseBenchmarkFailureResult> = []

  for (const providerName of providerNames) {
    try {
      results.push(await runnerFactory(providerName).run(options.caseId))
    } catch (caught) {
      if (!('all' in options)) throw caught
      const value = caught as any
      const message = caught instanceof Error ? caught.message : String(caught)
      const diagnostic = value?.benchmarkDiagnostic || {
        failing_stage: value?.failingStage || 'unknown',
        schema_validation_error: value?.schemaValidationError || value?.validation,
        provider: providerName,
      }
      const failure = {
        caseId: options.caseId,
        provider: providerName,
        status: 'failed' as const,
        error: {
          code: value?.code || message,
          message,
        },
        failing_stage: diagnostic.failing_stage || value?.failingStage || 'unknown',
        diagnostic,
      }
      const errorPath = await storage.saveFailure(
        runId,
        options.caseId,
        providerName,
        {
          case_id: options.caseId,
          provider: providerName,
          status: failure.status,
          error: failure.error,
          failing_stage: failure.failing_stage,
          diagnostic: failure.diagnostic,
        },
      )
      results.push({ ...failure, errorPath })
    }
  }

  const outputs = results.map((result, index) => isFailureResult(result)
    ? {
        case_id: result.caseId,
        provider: result.provider,
        status: result.status,
        error: result.error,
        failing_stage: result.failing_stage,
        diagnostic: result.diagnostic,
        error_report: result.errorPath,
      }
    : {
        case_id: result.caseId,
        provider: providerNames[index],
        case_model: result.caseModelPath,
        evaluation_report: result.evaluationReportPath,
        ...(result.runtimePath ? { runtime: result.runtimePath } : {}),
        ...(result.rawAIResponsePath ? { raw_ai_response: result.rawAIResponsePath } : {}),
        ...(result.decisionFactorReviewPath
          ? { decision_factor_review: result.decisionFactorReviewPath }
          : {}),
        ...(result.baseCaseModelPath ? { base_case_model: result.baseCaseModelPath } : {}),
        ...(result.afterConflictEnhancementPath
          ? { after_conflict_enhancement: result.afterConflictEnhancementPath }
          : {}),
        ...(result.afterDecisionFactorEnhancementPath
          ? { after_decision_factor_enhancement: result.afterDecisionFactorEnhancementPath }
          : {}),
        ...(result.afterReviewPath ? { after_review: result.afterReviewPath } : {}),
        score: result.evaluation.score,
        status: result.evaluation.status,
      })
  const output = 'all' in options ? outputs : outputs[0]
  ;(dependencies.write || ((text) => process.stdout.write(text)))(`${JSON.stringify(output, null, 2)}\n`)
  return 'all' in options ? results : results[0]
}

if (require.main === module) {
  runCaseIntelligenceBenchmarkCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`Case Intelligence benchmark failed:\n${formatCaseBenchmarkError(error)}\n`)
    process.exitCode = 1
  })
}
