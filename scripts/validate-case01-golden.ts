import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

type JsonObject = Record<string, unknown>

type Rule = {
  required: boolean
  minimum: number
  weight: number
  critical_fields?: string[]
}

type RulesFile = {
  case_id: string
  modules: Record<string, Rule>
}

type ScoringFile = {
  max_score: number
  pass_score: number
  excellent_score: number
  module_weights: Record<string, number>
  critical_failures: Array<{
    failure_id: string
    description: string
    blocking: boolean
  }>
}

type ModuleResult = {
  score: number
  max_score: number
  passed: boolean
  expected_count: number
  actual_count: number
  minimum: number
  missing_fields: string[]
  notes: string[]
}

const __filename = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(__filename), '..')
const caseRoot = path.join(repoRoot, 'test-data', 'case01_golden')
const expectedRoot = path.join(caseRoot, 'expected')
const defaultActualRoot = path.join(caseRoot, 'actual')
const defaultReportPath = path.join(caseRoot, 'reports', 'latest.json')

const moduleNames = [
  'matter',
  'materials',
  'evidence',
  'facts',
  'issues',
  'laws',
  'arguments',
  'research',
  'documents',
  'execution',
]

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T
  } catch {
    return null
  }
}

function getModuleValue(data: JsonObject | null, moduleName: string): unknown {
  if (!data) return null
  return data[moduleName] ?? null
}

function getCount(value: unknown): number {
  if (Array.isArray(value)) return value.length
  return value && typeof value === 'object' ? 1 : 0
}

function asRecord(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : null
}

function textIncludesAll(value: unknown, terms: string[]): boolean {
  const text = JSON.stringify(value ?? '')
  return terms.every((term) => text.includes(term))
}

function textIncludesAny(value: unknown, terms: string[]): boolean {
  const text = JSON.stringify(value ?? '')
  return terms.some((term) => text.includes(term))
}

function parseArgs(argv: string[]) {
  const args = {
    actualRoot: defaultActualRoot,
    reportPath: defaultReportPath,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const value = argv[index + 1]
    if (arg === '--actual' && value) {
      args.actualRoot = path.resolve(repoRoot, value)
      index += 1
    } else if (arg === '--report' && value) {
      args.reportPath = path.resolve(repoRoot, value)
      index += 1
    }
  }

  return args
}

function buildActualCorpus(actualValues: Record<string, unknown>) {
  return {
    matter: actualValues.matter,
    all: actualValues,
  }
}

function findMatterMissingFields(value: unknown, corpus: ReturnType<typeof buildActualCorpus>, fields: string[]) {
  const record = asRecord(value)
  const missing: string[] = []

  for (const field of fields) {
    if (field === 'title') {
      if (!record?.title) missing.push(field)
    } else if (field === 'matter_type') {
      if (!record?.matter_type) missing.push(field)
    } else if (field === 'parties') {
      if (!textIncludesAll(corpus.all, ['张建国', '李海涛'])) missing.push(field)
    } else if (field === 'amount') {
      if (!textIncludesAll(corpus.all, ['200000', '180000'])) missing.push(field)
    } else if (field === 'loan_date') {
      if (!textIncludesAll(corpus.all, ['2023-05-10'])) missing.push(field)
    } else if (field === 'due_date') {
      if (!textIncludesAll(corpus.all, ['2023-11-10'])) missing.push(field)
    } else if (!record?.[field]) {
      missing.push(field)
    }
  }

  return missing
}

function findMissingFields(value: unknown, fields: string[]): string[] {
  const first = Array.isArray(value) ? value[0] : value
  const record = asRecord(first)
  if (!record) return fields
  return fields.filter((field) => {
    const fieldValue = record[field]
    if (Array.isArray(fieldValue)) return fieldValue.length === 0
    return fieldValue === undefined || fieldValue === null || fieldValue === ''
  })
}

function hasEmptyDocumentContent(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return true
  return value.some((doc) => {
    const record = asRecord(doc)
    if (!record) return true
    const summary = record.golden_content_summary
    if (typeof summary !== 'string' || summary.trim().length === 0) return true
    return ['placeholder', 'lorem ipsum', 'todo'].some((term) =>
      summary.toLowerCase().includes(term),
    )
  })
}

function hasCoreEvidence(value: unknown): boolean {
  const text = JSON.stringify(value ?? '')
  const groups = [
    ['借条', 'loan note'],
    ['转账', '银行', 'transfer'],
    ['还款', 'repayment'],
    ['承认', '确认', 'acknowledgment'],
    ['律师函', 'demand letter'],
  ]
  return groups.every((group) => group.some((term) => text.includes(term)))
}

async function main() {
  const startedAt = new Date().toISOString()
  const args = parseArgs(process.argv.slice(2))
  const manifest = await readJson<JsonObject>(path.join(caseRoot, 'manifest.json'))
  const rules = await readJson<RulesFile>(path.join(caseRoot, 'validator', 'rules.json'))
  const scoring = await readJson<ScoringFile>(path.join(caseRoot, 'validator', 'scoring.json'))

  if (!manifest || !rules || !scoring) {
    throw new Error('Missing manifest.json, rules.json, or scoring.json')
  }

  const moduleResults: Record<string, ModuleResult> = {}
  const criticalFailures = new Set<string>()
  const actualValues: Record<string, unknown> = {}
  const expectedValues: Record<string, unknown> = {}

  for (const moduleName of moduleNames) {
    const expected = await readJson<JsonObject>(path.join(expectedRoot, `${moduleName}.json`))
    const actual = await readJson<JsonObject>(path.join(args.actualRoot, `${moduleName}.json`))
    expectedValues[moduleName] = getModuleValue(expected, moduleName)
    actualValues[moduleName] = getModuleValue(actual, moduleName)
  }

  const corpus = buildActualCorpus(actualValues)

  for (const moduleName of moduleNames) {
    const rule = rules.modules[moduleName]
    const actual = await readJson<JsonObject>(path.join(args.actualRoot, `${moduleName}.json`))
    const expectedValue = expectedValues[moduleName]
    const actualValue = actualValues[moduleName]
    const expectedCount = getCount(expectedValue)
    const actualCount = getCount(actualValue)
    const missingFields =
      moduleName === 'matter'
        ? findMatterMissingFields(actualValue, corpus, rule.critical_fields ?? [])
        : findMissingFields(actualValue, rule.critical_fields ?? [])
    const notes: string[] = []

    if (!actual) notes.push('actual module file missing or invalid JSON')
    if (actualCount < rule.minimum) notes.push(`actual count ${actualCount} below minimum ${rule.minimum}`)
    if (missingFields.length > 0) notes.push(`missing critical fields: ${missingFields.join(', ')}`)

    const countRatio = rule.minimum > 0 ? Math.min(actualCount / rule.minimum, 1) : 1
    const fieldRatio =
      rule.critical_fields && rule.critical_fields.length > 0
        ? (rule.critical_fields.length - missingFields.length) / rule.critical_fields.length
        : 1
    const maxScore = scoring.module_weights[moduleName] ?? rule.weight
    const score = Math.round(maxScore * countRatio * Math.max(fieldRatio, 0))

    moduleResults[moduleName] = {
      score,
      max_score: maxScore,
      passed: actualCount >= rule.minimum && missingFields.length === 0,
      expected_count: expectedCount,
      actual_count: actualCount,
      minimum: rule.minimum,
      missing_fields: missingFields,
      notes,
    }
  }

  const actualEvidence = actualValues.evidence
  const actualDocuments = actualValues.documents

  if (!textIncludesAll(corpus.all, ['张建国', '李海涛'])) criticalFailures.add('wrong_parties')
  if (!textIncludesAll(corpus.all, ['200000', '180000'])) criticalFailures.add('wrong_amount')
  if (!textIncludesAll(corpus.all, ['2023-05-10'])) criticalFailures.add('wrong_loan_date')
  if (!textIncludesAll(corpus.all, ['2023-11-10'])) criticalFailures.add('wrong_due_date')
  if (!hasCoreEvidence(actualEvidence)) criticalFailures.add('missing_core_evidence')
  if (hasEmptyDocumentContent(actualDocuments)) criticalFailures.add('empty_document_content')

  const rawScore = Object.values(moduleResults).reduce((sum, result) => sum + result.score, 0)
  const blockingFailures = scoring.critical_failures
    .filter((failure) => failure.blocking && criticalFailures.has(failure.failure_id))
    .map((failure) => failure.failure_id)
  const overallScore = Math.min(rawScore, scoring.max_score)
  const passed = overallScore >= scoring.pass_score && blockingFailures.length === 0

  const report = {
    case_id: rules.case_id,
    run_id: `case01_${Date.now()}`,
    model: process.env.MODEL ?? '',
    provider: process.env.AI_PROVIDER ?? '',
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    module_results: moduleResults,
    critical_failures: blockingFailures,
    overall_score: overallScore,
    passed,
    notes: passed
      ? ['Case01 golden validation passed.']
      : ['Case01 golden validation failed. Review module notes and critical failures.'],
  }

  await mkdir(path.dirname(args.reportPath), { recursive: true })
  await writeFile(args.reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({
    report: path.relative(repoRoot, args.reportPath),
    overall_score: overallScore,
    passed,
    critical_failures: blockingFailures,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
