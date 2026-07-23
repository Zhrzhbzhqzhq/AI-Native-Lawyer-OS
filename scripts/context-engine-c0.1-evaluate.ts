import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnvironment } from 'dotenv'
import DirectMiniMaxBenchmarkProvider from '../apps/backend/src/services/case-intelligence/adapters/DirectMiniMaxBenchmarkProvider'
import BenchmarkCaseLoader from '../apps/backend/src/services/case-intelligence/benchmark/BenchmarkCaseLoader'
import type { BenchmarkCase } from '../apps/backend/src/services/case-intelligence/benchmark/types/benchmark.types'
import { normalizeCaseModel } from '../apps/backend/src/services/case-intelligence/CaseModelNormalizer'
import type { CaseModel } from '../apps/backend/src/services/case-intelligence/types/caseModel.types'
import { parseAIJson } from '../apps/backend/src/services/ai/parseAIJson'
import CaseUnderstandingGenerator from '../apps/backend/src/services/context_engine/case_understanding_generator'
import {
  caseUnderstandingToComparable,
  caseModelToComparable,
  compareContextEngine,
  type ContextEngineComparisonReport,
} from '../apps/backend/src/services/context_engine/context_engine_evaluator'
import type { MinimalMatterContextSnapshot } from '../apps/backend/src/services/context_engine/context_types'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const benchmarkRoot = path.join(repositoryRoot, 'test-data/case-intelligence-benchmark')
const outputRoot = path.join(repositoryRoot, 'storage/context-engine-c0.1/evaluations')
const CASE_IDS = ['case-003', 'case-004', 'case-006'] as const

const environment = loadEnvironment({
  path: path.join(repositoryRoot, 'apps/backend/.env'),
  override: true,
})
if (environment.error) throw environment.error

type EvaluationCaseReport = {
  caseId: string
  title: string
  status: 'completed' | 'failed'
  baselineResponse: string
  contextEngineResponse: string
  comparisonReport: string
  comparison?: ContextEngineComparisonReport
  error?: string
}

function fixtureSnapshot(benchmarkCase: BenchmarkCase): MinimalMatterContextSnapshot {
  const context = benchmarkCase.input.context
  if (!Array.isArray(context)) throw new Error(`evaluation_context_invalid:${benchmarkCase.caseId}`)
  const materials = context.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`evaluation_material_invalid:${benchmarkCase.caseId}:${index}`)
    }
    const material = item as Record<string, unknown>
    const content = String(material.content || '')
    if (!content.trim()) throw new Error(`evaluation_material_content_missing:${benchmarkCase.caseId}:${index}`)
    return {
      materialId: String(material.id || `material-${index + 1}`),
      title: String(material.title || `材料 ${index + 1}`),
      materialType: 'benchmark_fixture',
      source: 'benchmark_fixture',
      storageUri: `fixture://${benchmarkCase.caseId}/${index + 1}`,
      content,
      contentLength: content.length,
    }
  })
  const matter = {
    matterId: benchmarkCase.caseId,
    title: benchmarkCase.input.title,
    description: '',
    matterType: '',
  }
  const sourceHash = createHash('sha256').update(JSON.stringify({ matter, materials })).digest('hex')
  return {
    contextVersion: 'context-engine-c0.1',
    matterId: benchmarkCase.caseId,
    generatedAt: new Date().toISOString(),
    sourceHash,
    matter,
    materials,
    completeness: {
      complete: true,
      totalMaterials: materials.length,
      readableMaterials: materials.length,
      unavailableMaterials: [],
    },
  }
}

async function writeJson(target: string, value: unknown) {
  const temporary = `${target}.${randomUUID()}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  await rename(temporary, target)
}

function relative(target: string) {
  return path.relative(repositoryRoot, target).split(path.sep).join('/')
}

function rawBaselineModel(record: any): CaseModel | null {
  const response = record?.response ?? record
  const body = response?.response ?? response
  const content = body?.choices?.[0]?.message?.content
    ?? body?.data?.choices?.[0]?.message?.content
    ?? (Array.isArray(body?.content) ? body.content.map((part: any) => typeof part === 'string' ? part : part?.text || '').join('\n') : null)
  const parsed = typeof content === 'string' ? parseAIJson(content).data : content
  const normalized = normalizeCaseModel(parsed) as any
  return normalized
    && normalized.identity
    && normalized.narrative
    && Array.isArray(normalized.actors)
    && Array.isArray(normalized.timeline)
    && Array.isArray(normalized.conflicts)
    && Array.isArray(normalized.unknowns)
    ? normalized as CaseModel
    : null
}

function markdown(runId: string, reports: EvaluationCaseReport[]) {
  const completed = reports.filter((report) => report.status === 'completed')
  const recovered = completed.filter((report) => report.comparison?.recovered).length
  return [
    '# Context Engine Evaluation Report',
    '',
    `- Run ID: ${runId}`,
    `- Model: ${process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3'}`,
    `- Cases: ${reports.length}`,
    `- Completed: ${completed.length}`,
    `- Recovered: ${recovered}/${reports.length}`,
    '',
    '| Case | Baseline | Context Engine | Delta | Recovered |',
    '|---|---:|---:|---:|---|',
    ...reports.map((report) => report.comparison
      ? `| ${report.caseId} ${report.title} | ${report.comparison.baselineScore} | ${report.comparison.contextEngineScore} | ${report.comparison.delta} | ${report.comparison.recovered ? 'YES' : 'NO'} |`
      : `| ${report.caseId} ${report.title} | - | - | - | FAILED |`),
    '',
    ...reports.flatMap((report) => [
      `## ${report.caseId} — ${report.title}`,
      '',
      report.comparison
        ? `Case Identity ${report.comparison.contextEngine.caseIdentity.score}; Narrative ${report.comparison.contextEngine.narrative.score}; Actors ${report.comparison.contextEngine.actors.score}; Timeline ${report.comparison.contextEngine.timeline.score}; Conflicts ${report.comparison.contextEngine.conflicts.score}; Unknowns ${report.comparison.contextEngine.unknowns.score}; Hallucination ${report.comparison.contextEngine.hallucination.score}.`
        : `Evaluation failed: ${report.error || 'unknown error'}`,
      '',
      `- Baseline response: ${report.baselineResponse}`,
      `- Context Engine response: ${report.contextEngineResponse}`,
      `- Comparison: ${report.comparisonReport}`,
      '',
    ]),
  ].join('\n')
}

async function evaluateCase(runDirectory: string, benchmarkCase: BenchmarkCase): Promise<EvaluationCaseReport> {
  const caseDirectory = path.join(runDirectory, benchmarkCase.caseId)
  await mkdir(caseDirectory, { recursive: true })
  const baselinePath = path.join(caseDirectory, 'baseline-response.json')
  const contextPath = path.join(caseDirectory, 'context-engine-response.json')
  const comparisonPath = path.join(caseDirectory, 'comparison-report.json')
  const reportBase = {
    caseId: benchmarkCase.caseId,
    title: benchmarkCase.input.title,
    baselineResponse: relative(baselinePath),
    contextEngineResponse: relative(contextPath),
    comparisonReport: relative(comparisonPath),
  }

  let baselineRaw: unknown = null
  let contextRaw: unknown = null
  let baselineSaved = false
  let contextSaved = false
  try {
    const baselineProvider = new DirectMiniMaxBenchmarkProvider(undefined, {
      onResponse: (record) => { baselineRaw = record },
    })
    let baselineModel: CaseModel
    let baselineValidationWarning: string | null = null
    try {
      baselineModel = await baselineProvider.generateCaseModel(benchmarkCase.input)
    } catch (error) {
      baselineValidationWarning = error instanceof Error ? error.message : String(error)
      const recoveredModel = rawBaselineModel(baselineRaw)
      if (!recoveredModel) throw error
      baselineModel = recoveredModel
    }
    await writeJson(baselinePath, {
      caseId: benchmarkCase.caseId,
      provider: 'direct-minimax',
      model: process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3',
      rawResponse: baselineRaw,
      caseUnderstanding: caseModelToComparable(baselineModel),
      ...(baselineValidationWarning ? { validationWarning: baselineValidationWarning } : {}),
    })
    baselineSaved = true

    const snapshot = fixtureSnapshot(benchmarkCase)
    const generation = await new CaseUnderstandingGenerator().generate(snapshot)
    contextRaw = generation.rawResponse
    await writeJson(contextPath, {
      caseId: benchmarkCase.caseId,
      provider: generation.provider,
      model: generation.model,
      promptLength: generation.promptLength,
      contextSnapshot: snapshot,
      rawResponse: generation.rawResponse,
      ...(generation.ok ? { caseUnderstanding: generation.result } : { error: generation.error }),
    })
    contextSaved = true
    if (!generation.ok) throw new Error(generation.error.code)

    const sourceText = JSON.stringify(benchmarkCase.input.context)
    const comparison = compareContextEngine(
      caseModelToComparable(baselineModel),
      caseUnderstandingToComparable(generation.result),
      benchmarkCase.goldenCaseModel,
      sourceText,
    )
    await writeJson(comparisonPath, {
      caseId: benchmarkCase.caseId,
      title: benchmarkCase.input.title,
      goldenReference: caseModelToComparable(benchmarkCase.goldenCaseModel),
      ...comparison,
    })
    return { ...reportBase, status: 'completed', comparison }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!baselineSaved) await writeJson(baselinePath, { status: 'failed', error: message, rawResponse: baselineRaw })
    if (!contextSaved) await writeJson(contextPath, { status: 'failed', error: message, rawResponse: contextRaw })
    await writeJson(comparisonPath, { caseId: benchmarkCase.caseId, status: 'failed', error: message })
    return { ...reportBase, status: 'failed', error: message }
  }
}

async function rescoreCase(runDirectory: string, benchmarkCase: BenchmarkCase): Promise<EvaluationCaseReport> {
  const caseDirectory = path.join(runDirectory, benchmarkCase.caseId)
  const baselinePath = path.join(caseDirectory, 'baseline-response.json')
  const contextPath = path.join(caseDirectory, 'context-engine-response.json')
  const comparisonPath = path.join(caseDirectory, 'comparison-report.json')
  const reportBase = {
    caseId: benchmarkCase.caseId,
    title: benchmarkCase.input.title,
    baselineResponse: relative(baselinePath),
    contextEngineResponse: relative(contextPath),
    comparisonReport: relative(comparisonPath),
  }
  try {
    const baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
    const contextEngine = JSON.parse(await readFile(contextPath, 'utf8'))
    if (!baseline.caseUnderstanding || !contextEngine.caseUnderstanding) throw new Error('evaluation_response_missing')
    const comparison = compareContextEngine(
      caseUnderstandingToComparable(baseline.caseUnderstanding),
      caseUnderstandingToComparable(contextEngine.caseUnderstanding),
      benchmarkCase.goldenCaseModel,
      JSON.stringify(benchmarkCase.input.context),
    )
    await writeJson(comparisonPath, {
      caseId: benchmarkCase.caseId,
      title: benchmarkCase.input.title,
      goldenReference: caseModelToComparable(benchmarkCase.goldenCaseModel),
      ...comparison,
    })
    return { ...reportBase, status: 'completed', comparison }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await writeJson(comparisonPath, { caseId: benchmarkCase.caseId, status: 'failed', error: message })
    return { ...reportBase, status: 'failed', error: message }
  }
}

async function saveFinalReport(runId: string, runDirectory: string, reports: EvaluationCaseReport[]) {
  const completed = reports.filter((report) => report.status === 'completed')
  const summary = {
    title: 'Context Engine Evaluation Report',
    runId,
    generatedAt: new Date().toISOString(),
    model: process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3',
    cases: reports,
    summary: {
      requested: reports.length,
      completed: completed.length,
      recovered: completed.filter((report) => report.comparison?.recovered).length,
      averageBaselineScore: completed.length ? Math.round(100 * completed.reduce((sum, report) => sum + (report.comparison?.baselineScore || 0), 0) / completed.length) / 100 : 0,
      averageContextEngineScore: completed.length ? Math.round(100 * completed.reduce((sum, report) => sum + (report.comparison?.contextEngineScore || 0), 0) / completed.length) / 100 : 0,
    },
  }
  const reportJsonPath = path.join(runDirectory, 'context-engine-evaluation-report.json')
  const reportMarkdownPath = path.join(runDirectory, 'context-engine-evaluation-report.md')
  await writeJson(reportJsonPath, summary)
  await writeFile(reportMarkdownPath, `${markdown(runId, reports)}\n`, { encoding: 'utf8', mode: 0o600 })
  process.stdout.write(`${JSON.stringify({
    ...summary.summary,
    runId,
    reportJson: relative(reportJsonPath),
    reportMarkdown: relative(reportMarkdownPath),
  }, null, 2)}\n`)
  if (completed.length !== reports.length) process.exitCode = 1
}

async function main() {
  const argumentsList = process.argv.slice(2)
  const rescoreIndex = argumentsList.indexOf('--rescore')
  const rescoreRunId = rescoreIndex >= 0 ? String(argumentsList[rescoreIndex + 1] || '').trim() : ''
  if (rescoreIndex >= 0 && !/^[a-f0-9-]{36}$/i.test(rescoreRunId)) throw new Error('evaluation_rescore_run_id_invalid')
  const runId = rescoreRunId || randomUUID()
  const runDirectory = path.join(outputRoot, runId)
  await mkdir(runDirectory, { recursive: true })
  const loader = new BenchmarkCaseLoader(benchmarkRoot)
  const reports: EvaluationCaseReport[] = []
  for (const caseId of CASE_IDS) {
    const benchmarkCase = await loader.load(caseId)
    reports.push(rescoreRunId
      ? await rescoreCase(runDirectory, benchmarkCase)
      : await evaluateCase(runDirectory, benchmarkCase))
  }
  await saveFinalReport(runId, runDirectory, reports)
}

main().catch((error) => {
  process.stderr.write(`Context Engine evaluation failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
