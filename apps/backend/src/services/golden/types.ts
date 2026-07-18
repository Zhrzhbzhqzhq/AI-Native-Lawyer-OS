export type GoldenImport = Record<string, unknown>

export type GoldenEvaluationCheck = {
  id: string
  description?: string
  required?: boolean
  weight?: number
  [key: string]: unknown
}

export type GoldenEvaluation = {
  checks?: GoldenEvaluationCheck[]
  [key: string]: unknown
}

export type GoldenCheckResult = {
  id: string
  status: 'not_evaluated'
  passed: null
  description?: string
  required: boolean
  weight: number | null
}

export type GoldenInitialResult = {
  golden_id: string
  status: 'ready'
  passed: null
  import_data: GoldenImport
  evaluation: GoldenEvaluation
  checks: GoldenCheckResult[]
  summary: {
    total: number
    evaluated: 0
    passed: 0
    failed: 0
    pending: number
  }
}
