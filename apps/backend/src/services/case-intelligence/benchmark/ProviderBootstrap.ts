import { CaseIntelligenceAIProvider } from '../adapters/CaseIntelligenceAIProvider'
import DirectMiniMaxBenchmarkProvider from '../adapters/DirectMiniMaxBenchmarkProvider'
import ConflictEnhancer from '../enhancement/ConflictEnhancer'
import DecisionFactorEnhancer from '../enhancement/DecisionFactorEnhancer'
import EnhancementOrchestrator from '../enhancement/EnhancementOrchestrator'
import EvidenceAwareDecisionFactorEnhancer from '../enhancement/EvidenceAwareDecisionFactorEnhancer'
import DecisionFactorEvidenceReviewer from '../enhancement/DecisionFactorEvidenceReviewer'
import DecisionFactorGroundingNormalizer from '../enhancement/DecisionFactorGroundingNormalizer'
import HybridCaseIntelligenceProvider from '../hybrid/HybridCaseIntelligenceProvider'
import { CaseChiefPipeline, MockCaseIntelligenceProvider } from '../pipeline'
import ProviderRegistry from './ProviderRegistry'
import type { BenchmarkProvider } from './types/benchmark.types'
import EnhancedV4BenchmarkProvider from './providers/EnhancedV4BenchmarkProvider'

const DEFAULT_MINIMAX_MODEL = 'MiniMax-M3'

function stagedResponse(stage: string, record: { response: unknown }) {
  return { stage, response: record.response }
}

function minimaxModel(): string {
  return process.env.MINIMAX_MODEL || process.env.AI_MODEL || DEFAULT_MINIMAX_MODEL
}

function createProviders(): readonly BenchmarkProvider[] {
  const model = minimaxModel()
  const minimaxResponses: unknown[] = []
  const directResponses: unknown[] = []
  const enhancedResponses: unknown[] = []
  const enhancedV2Responses: unknown[] = []
  const enhancedV3Responses: unknown[] = []
  const enhancedV4Responses: unknown[] = []
  const mock = new CaseChiefPipeline(new MockCaseIntelligenceProvider())
  const minimax = new CaseChiefPipeline(new CaseIntelligenceAIProvider(undefined, {
    onResponse: (response) => minimaxResponses.push(response),
  }))
  const directMiniMax = new DirectMiniMaxBenchmarkProvider(undefined, {
    onResponse: (response) => {
      directResponses.push(response)
      enhancedResponses.push(stagedResponse('direct', response))
      enhancedV2Responses.push(stagedResponse('direct', response))
      enhancedV3Responses.push(stagedResponse('direct', response))
      enhancedV4Responses.push(stagedResponse('direct', response))
    },
  })
  const conflictEnhancer = new ConflictEnhancer(undefined, {
    onResponse: (response) => enhancedResponses.push(stagedResponse('conflict-enhancement', response)),
  })
  const enhancedV2ConflictEnhancer = new ConflictEnhancer(undefined, {
    onResponse: (response) => enhancedV2Responses.push(stagedResponse('conflict-enhancement', response)),
  })
  const decisionFactorEnhancer = new DecisionFactorEnhancer(undefined, {
    onResponse: (response) => enhancedV2Responses.push(stagedResponse('decision-factor-enhancement', response)),
  })
  const enhancementOrchestrator = new EnhancementOrchestrator(
    enhancedV2ConflictEnhancer,
    decisionFactorEnhancer,
  )
  const enhancedV3ConflictEnhancer = new ConflictEnhancer(undefined, {
    onResponse: (response) => enhancedV3Responses.push(stagedResponse('conflict-enhancement', response)),
  })
  const evidenceAwareDecisionFactorEnhancer = new EvidenceAwareDecisionFactorEnhancer(undefined, {
    onResponse: (response) => enhancedV3Responses.push({
      ...stagedResponse('evidence-aware-decision-factor-enhancement', response),
    }),
  })
  const enhancedV4ConflictEnhancer = new ConflictEnhancer(undefined, {
    onResponse: (response) => enhancedV4Responses.push(stagedResponse('conflict-enhancement', response)),
  })
  const enhancedV4DecisionFactorEnhancer = new DecisionFactorEnhancer(undefined, {
    onResponse: (response) => enhancedV4Responses.push({
      ...stagedResponse('decision-factor-enhancement', response),
    }),
  })
  const decisionFactorEvidenceReviewer = new DecisionFactorEvidenceReviewer(undefined, {
    onResponse: (response) => enhancedV4Responses.push({
      stage: 'decision-factor-evidence-review',
      response,
    }),
    groundingNormalizer: new DecisionFactorGroundingNormalizer(),
  })
  const enhancedV4 = new EnhancedV4BenchmarkProvider(
    directMiniMax,
    enhancedV4ConflictEnhancer,
    enhancedV4DecisionFactorEnhancer,
    decisionFactorEvidenceReviewer,
  )
  const hybridMiniMax = new HybridCaseIntelligenceProvider()

  return [
    {
      id: 'mock',
      model: 'MockCaseIntelligenceProvider',
      generateCaseModel: (input) => mock.buildModel(input),
    },
    {
      id: 'minimax',
      model,
      generateCaseModel: (input) => minimax.buildModel(input),
      diagnostics: () => ({ provider: 'minimax', model, responses: minimaxResponses }),
    },
    {
      id: 'direct-minimax',
      model,
      usesDirectBase: true,
      generateCaseModel: (input, context) => context?.baseCaseModel
        ? Promise.resolve(structuredClone(context.baseCaseModel))
        : directMiniMax.generateCaseModel(input),
      diagnostics: () => ({ provider: 'direct-minimax', model, responses: directResponses }),
    },
    {
      id: 'enhanced-minimax',
      model,
      usesDirectBase: true,
      generateCaseModel: async (input, context) => {
        const directModel = context?.baseCaseModel
          || await directMiniMax.generateCaseModel(input)
        return conflictEnhancer.enhance(input, directModel)
      },
      diagnostics: () => ({ provider: 'enhanced-minimax', model, responses: enhancedResponses }),
    },
    {
      id: 'enhanced-v2-minimax',
      model,
      usesDirectBase: true,
      generateCaseModel: async (input, context) => {
        const directModel = context?.baseCaseModel
          || await directMiniMax.generateCaseModel(input)
        return (await enhancementOrchestrator.enhance(input, directModel)).enhancedCaseModel
      },
      artifacts: () => enhancementOrchestrator.artifacts(),
      diagnostics: () => ({ provider: 'enhanced-v2-minimax', model, responses: enhancedV2Responses }),
    },
    {
      id: 'enhanced-v3-minimax',
      model,
      usesDirectBase: true,
      generateCaseModel: async (input, context) => {
        const directModel = context?.baseCaseModel
          || await directMiniMax.generateCaseModel(input)
        const conflictEnhancedModel = await enhancedV3ConflictEnhancer.enhance(input, directModel)
        return evidenceAwareDecisionFactorEnhancer.enhance(
          input,
          conflictEnhancedModel,
          conflictEnhancedModel.conflicts,
        )
      },
      diagnostics: () => ({ provider: 'enhanced-v3-minimax', model, responses: enhancedV3Responses }),
    },
    {
      id: 'enhanced-v4-minimax',
      model,
      usesDirectBase: true,
      generateCaseModel: (input, context) => enhancedV4.generateCaseModel(
        input,
        context?.baseCaseModel,
      ),
      artifacts: () => enhancedV4.artifacts(),
      diagnostics: () => ({ provider: 'enhanced-v4-minimax', model, responses: enhancedV4Responses }),
    },
    {
      id: 'hybrid-minimax',
      model,
      generateCaseModel: (input) => hybridMiniMax.generateCaseModel(input),
    },
  ]
}

export class ProviderBootstrap {
  bootstrap(registry = new ProviderRegistry()): ProviderRegistry {
    for (const provider of createProviders()) registry.register(provider)
    return registry
  }
}

export function bootstrapBenchmarkProviders(registry?: ProviderRegistry): ProviderRegistry {
  return new ProviderBootstrap().bootstrap(registry)
}

export default ProviderBootstrap
