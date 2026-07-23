export type CaseBenchmarkFixtureBoundary = {
  required: readonly string[]
  forbidden: readonly string[]
}

export const CASE_BENCHMARK_FIXTURE_BOUNDARIES: Readonly<Record<string, CaseBenchmarkFixtureBoundary>> = {
  'case-006': {
    required: ['股权', '转让', '交割'],
    forbidden: ['劳动', '工资', '员工', '解除'],
  },
}

export type CaseBenchmarkFixtureValidationResult = {
  ok: boolean
  missingRequired: string[]
  forbiddenMatches: string[]
}

function collectText(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectText)
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectText)
  return []
}

export function validateCaseBenchmarkFixture(
  caseId: string,
  fixture: unknown,
): CaseBenchmarkFixtureValidationResult {
  const boundary = CASE_BENCHMARK_FIXTURE_BOUNDARIES[caseId]
  if (!boundary) return { ok: true, missingRequired: [], forbiddenMatches: [] }

  const text = collectText(fixture).join('\n')
  const missingRequired = boundary.required.filter((keyword) => !text.includes(keyword))
  const forbiddenMatches = boundary.forbidden.filter((keyword) => text.includes(keyword))
  return {
    ok: missingRequired.length === 0 && forbiddenMatches.length === 0,
    missingRequired,
    forbiddenMatches,
  }
}

export function assertCaseBenchmarkFixtureBoundary(caseId: string, fixture: unknown): void {
  const validation = validateCaseBenchmarkFixture(caseId, fixture)
  if (validation.ok) return
  const error = new Error('fixture_contamination')
  ;(error as any).code = 'fixture_contamination'
  ;(error as any).validation = validation
  throw error
}

export default assertCaseBenchmarkFixtureBoundary
