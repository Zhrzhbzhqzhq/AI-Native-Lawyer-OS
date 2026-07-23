import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import BenchmarkDimensionSummaryReport, {
  BENCHMARK_DIMENSIONS,
} from '../../src/services/case-intelligence/benchmark/analysis/BenchmarkDimensionSummaryReport'

function evaluation(score: number, topicDriftScore = score) {
  return {
    dimensions: Object.fromEntries(BENCHMARK_DIMENSIONS.map((dimension) => [
      dimension,
      { score: dimension === 'topicDrift' ? topicDriftScore : score, weight: 1, details: '' },
    ])),
  }
}

async function writeEvaluation(
  root: string,
  runId: string,
  caseId: string,
  provider: string,
  value: unknown,
) {
  const directory = path.join(root, runId, caseId, provider)
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, 'evaluation-report.json'), JSON.stringify(value), 'utf8')
}

describe('BenchmarkDimensionSummaryReport', () => {
  it('summarizes dimensions and ranks Providers per case and across the batch', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-benchmark-summary-'))
    await writeEvaluation(root, 'run-001', 'case-001', 'direct-minimax', evaluation(80))
    await writeEvaluation(root, 'run-001', 'case-001', 'hybrid-minimax', evaluation(90))
    await writeEvaluation(root, 'run-001', 'case-002', 'direct-minimax', evaluation(70))
    await writeEvaluation(root, 'run-001', 'case-002', 'hybrid-minimax', evaluation(60, 100))

    const { summary, outputPath } = await new BenchmarkDimensionSummaryReport(root).generate('run-001')

    expect(summary.cases).toHaveLength(2)
    expect(summary.cases[0].providers.map(({ provider, averageScore, rank }) => ({
      provider,
      averageScore,
      rank,
    }))).toEqual([
      { provider: 'hybrid-minimax', averageScore: 90, rank: 1 },
      { provider: 'direct-minimax', averageScore: 80, rank: 2 },
    ])
    expect(summary.providers.map(({ provider, rank }) => ({ provider, rank }))).toEqual([
      { provider: 'hybrid-minimax', rank: 1 },
      { provider: 'direct-minimax', rank: 2 },
    ])
    expect(summary.providers[0].dimensions.topicDrift).toBe(95)
    expect(JSON.parse(await readFile(outputPath, 'utf8'))).toEqual(summary)
    expect(path.basename(outputPath)).toBe('summary.json')
  })

  it('assigns the same rank to equal average scores', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-benchmark-summary-tie-'))
    await writeEvaluation(root, 'run-tie', 'case-001', 'minimax', evaluation(75))
    await writeEvaluation(root, 'run-tie', 'case-001', 'direct-minimax', evaluation(75))

    const { summary } = await new BenchmarkDimensionSummaryReport(root).generate('run-tie')

    expect(summary.cases[0].providers.map((provider) => provider.rank)).toEqual([1, 1])
  })
})
