import { existsSync } from 'node:fs'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const BENCHMARK_DIMENSIONS = [
  'identity',
  'narrative',
  'actors',
  'conflicts',
  'decisionFactors',
  'risks',
  'unknowns',
  'topicDrift',
] as const

export type BenchmarkDimension = typeof BENCHMARK_DIMENSIONS[number]
export type BenchmarkDimensionScores = Readonly<Record<BenchmarkDimension, number>>

export type BenchmarkDimensionProviderSummary = {
  provider: string
  dimensions: BenchmarkDimensionScores
  averageScore: number
  rank: number
}

export type BenchmarkDimensionCaseSummary = {
  caseId: string
  providers: BenchmarkDimensionProviderSummary[]
}

export type BenchmarkDimensionSummary = {
  schemaVersion: '1.0'
  runId: string
  generatedAt: string
  cases: BenchmarkDimensionCaseSummary[]
  providers: BenchmarkDimensionProviderSummary[]
}

function defaultResultRoot(): string {
  if (existsSync(path.resolve(process.cwd(), 'pnpm-workspace.yaml'))) {
    return path.resolve(process.cwd(), 'benchmark-results')
  }
  return path.resolve(process.cwd(), '../../benchmark-results')
}

function assertPathSegment(value: string): string {
  const normalized = String(value || '').trim()
  if (!normalized || normalized === '.' || normalized === '..' || /[\\/\0]/.test(normalized)) {
    throw new Error('benchmark_summary_run_id_invalid')
  }
  return normalized
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function average(values: readonly number[]): number {
  return round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function parseDimensionScores(value: unknown): BenchmarkDimensionScores {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('benchmark_summary_evaluation_invalid')
  }
  const evaluation = value as Record<string, unknown>
  if (!evaluation.dimensions || typeof evaluation.dimensions !== 'object'
    || Array.isArray(evaluation.dimensions)) {
    throw new Error('benchmark_summary_dimensions_invalid')
  }
  const dimensions = evaluation.dimensions as Record<string, unknown>
  return Object.fromEntries(BENCHMARK_DIMENSIONS.map((dimension) => {
    const entry = dimensions[dimension]
    const score = entry && typeof entry === 'object' && !Array.isArray(entry)
      ? (entry as Record<string, unknown>).score
      : undefined
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throw new Error(`benchmark_summary_dimension_invalid:${dimension}`)
    }
    return [dimension, score]
  })) as BenchmarkDimensionScores
}

function rankProviders(
  providers: Array<Omit<BenchmarkDimensionProviderSummary, 'rank'>>,
): BenchmarkDimensionProviderSummary[] {
  const sorted = [...providers].sort((left, right) => (
    right.averageScore - left.averageScore || left.provider.localeCompare(right.provider)
  ))
  let previousScore: number | undefined
  let previousRank = 0
  return sorted.map((provider, index) => {
    const rank = provider.averageScore === previousScore ? previousRank : index + 1
    previousScore = provider.averageScore
    previousRank = rank
    return { ...provider, rank }
  })
}

async function directories(directory: string): Promise<string[]> {
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

export class BenchmarkDimensionSummaryReport {
  constructor(private readonly resultRoot = defaultResultRoot()) {}

  async generate(runId: string): Promise<{ summary: BenchmarkDimensionSummary; outputPath: string }> {
    const normalizedRunId = assertPathSegment(runId)
    const runDirectory = path.join(this.resultRoot, normalizedRunId)
    const cases: BenchmarkDimensionCaseSummary[] = []

    for (const caseId of await directories(runDirectory)) {
      const providerSummaries: Array<Omit<BenchmarkDimensionProviderSummary, 'rank'>> = []
      for (const provider of await directories(path.join(runDirectory, caseId))) {
        const evaluationPath = path.join(
          runDirectory,
          caseId,
          provider,
          'evaluation-report.json',
        )
        const evaluation = JSON.parse(await readFile(evaluationPath, 'utf8'))
        const dimensions = parseDimensionScores(evaluation)
        providerSummaries.push({
          provider,
          dimensions,
          averageScore: average(BENCHMARK_DIMENSIONS.map((dimension) => dimensions[dimension])),
        })
      }
      cases.push({ caseId, providers: rankProviders(providerSummaries) })
    }

    const providerNames = Array.from(new Set(
      cases.flatMap((caseSummary) => caseSummary.providers.map((provider) => provider.provider)),
    )).sort()
    const providerSummaries = providerNames.map((provider) => {
      const caseResults = cases.flatMap((caseSummary) => (
        caseSummary.providers.filter((entry) => entry.provider === provider)
      ))
      const dimensions = Object.fromEntries(BENCHMARK_DIMENSIONS.map((dimension) => [
        dimension,
        average(caseResults.map((result) => result.dimensions[dimension])),
      ])) as BenchmarkDimensionScores
      return {
        provider,
        dimensions,
        averageScore: average(BENCHMARK_DIMENSIONS.map((dimension) => dimensions[dimension])),
      }
    })

    const summary: BenchmarkDimensionSummary = {
      schemaVersion: '1.0',
      runId: normalizedRunId,
      generatedAt: new Date().toISOString(),
      cases,
      providers: rankProviders(providerSummaries),
    }
    const outputPath = path.join(runDirectory, 'summary.json')
    await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
    return { summary, outputPath }
  }
}

export default BenchmarkDimensionSummaryReport

if (require.main === module) {
  const runId = process.argv[2]
  new BenchmarkDimensionSummaryReport().generate(runId).then(({ outputPath }) => {
    process.stdout.write(`${JSON.stringify({ summary: outputPath }, null, 2)}\n`)
  }).catch((error) => {
    process.stderr.write(`Benchmark summary failed: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
