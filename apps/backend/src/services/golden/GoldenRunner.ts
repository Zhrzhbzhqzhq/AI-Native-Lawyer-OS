import { GoldenEvaluator } from './GoldenEvaluator'
import { GoldenLoader } from './GoldenLoader'
import type { GoldenInitialResult } from './types'

export class GoldenRunner {
  constructor(
    private readonly loader = new GoldenLoader(),
    private readonly evaluator = new GoldenEvaluator(),
  ) {}

  runGoldenCase(goldenId: string): GoldenInitialResult {
    const importData = this.loader.loadImport(goldenId)
    const evaluation = this.loader.loadEvaluation(goldenId)
    return this.evaluator.evaluateInitial(goldenId, importData, evaluation)
  }
}

export function runGoldenCase(goldenId: string): GoldenInitialResult {
  return new GoldenRunner().runGoldenCase(goldenId)
}
