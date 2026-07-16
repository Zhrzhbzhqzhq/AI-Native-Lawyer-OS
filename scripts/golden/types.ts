export type GoldenProvider = 'mock' | 'minimax'

export type AIAudit = {
  provider: string
  model: string
  prompt_version: string
  fallback_used: boolean
}

export type StageAIAudit = AIAudit & { stage: string }

export type GoldenCaseConfig = {
  case_id: string
  name: string
  case_type: string
  document_type: string
  material_count: number
  expected_counts: Record<string, number>
}

export type EndpointResult = {
  step: string
  endpoint: string
  status: number | 'ERROR'
  ok: boolean
  summary?: string
}

export type GoldenRunJson = {
  run_id: string
  case_id: string
  dataset_version: string
  git_commit: string | null
  provider_requested: GoldenProvider
  provider_actual: string | null
  model_actual: string | null
  prompt_version: string | null
  fallback_used: boolean | null
  ai_audits: StageAIAudit[]
  audit_conflicts: string[]
  caller_declared_database: string
  matter_id: string | null
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  workflow_counts: Record<string, number>
  endpoint_results: EndpointResult[]
  word_export: {
    status: number | null
    content_type: string | null
    size_bytes: number | null
  }
  score: number | null
  pass: boolean
  passed: boolean
  hard_failures: string[]
  error?: {
    step: string
    message: string
  }
}

export type ModuleScore = {
  module: string
  score: number
  max_score: number
  passed: boolean
  checks: string[]
  missing: string[]
  warnings: string[]
  hard_failures: string[]
}

export type GoldenReport = {
  run_id: string
  case_id: string
  dataset_version: string
  git_commit: string | null
  provider_requested: string
  provider_actual: string | null
  model_actual: string | null
  prompt_version: string | null
  fallback_used: boolean | null
  caller_declared_database: string
  matter_id: string | null
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  score: number
  overall_score: number
  max_score: number
  passed: boolean
  hard_failures: string[]
  warnings: string[]
  missing: string[]
  unexpected: string[]
  hallucination_flags: string[]
  relation_errors: string[]
  module_results: ModuleScore[]
  workflow_counts: Record<string, number>
  word_export: GoldenRunJson['word_export']
  generated_at: string
}
