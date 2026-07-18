import type {
  GoldenCheckResult,
  GoldenEvaluation,
  GoldenEvaluationCheck,
  GoldenImport,
  GoldenInitialResult,
} from './types'

function normalizeChecks(evaluation: GoldenEvaluation): GoldenEvaluationCheck[] {
  if (typeof evaluation.checks === 'undefined') return []
  if (!Array.isArray(evaluation.checks)) throw new Error('golden_evaluation_checks_invalid')

  return evaluation.checks.map((check, index) => {
    if (!check || typeof check !== 'object' || Array.isArray(check)) {
      throw new Error(`golden_evaluation_check_invalid:${index}`)
    }
    const id = String(check.id || '').trim()
    if (!id) throw new Error(`golden_evaluation_check_id_required:${index}`)
    if (typeof check.weight !== 'undefined' && (!Number.isFinite(check.weight) || Number(check.weight) < 0)) {
      throw new Error(`golden_evaluation_check_weight_invalid:${id}`)
    }
    return { ...check, id }
  })
}

export class GoldenEvaluator {
  evaluateInitial(goldenId: string, importData: GoldenImport, evaluation: GoldenEvaluation): GoldenInitialResult {
    const checks: GoldenCheckResult[] = normalizeChecks(evaluation).map((check) => ({
      id: check.id,
      status: 'not_evaluated',
      passed: null,
      description: typeof check.description === 'string' ? check.description : undefined,
      required: check.required !== false,
      weight: typeof check.weight === 'number' ? check.weight : null,
    }))

    return {
      golden_id: goldenId,
      status: 'ready',
      passed: null,
      import_data: importData,
      evaluation,
      checks,
      summary: {
        total: checks.length,
        evaluated: 0,
        passed: 0,
        failed: 0,
        pending: checks.length,
      },
    }
  }
}
