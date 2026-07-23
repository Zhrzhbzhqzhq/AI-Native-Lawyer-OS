import { describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  parseCaseBenchmarkArgs,
  formatCaseBenchmarkError,
  runCaseIntelligenceBenchmarkCli,
} from '../../src/services/case-intelligence/cli/CaseIntelligenceBenchmarkCli'
import type { CaseBenchmarkResult } from '../../src/services/case-intelligence/CaseBenchmarkRunner'
import { mockCaseModel } from './caseModel.fixture'
import BenchmarkResultStorage from '../../src/services/case-intelligence/benchmark/storage/BenchmarkResultStorage'

const benchmarkResult: CaseBenchmarkResult = {
  caseId: 'case-006',
  caseModelPath: '/tmp/case-model.json',
  evaluationReportPath: '/tmp/evaluation-report.json',
  model: mockCaseModel(),
  evaluation: {
    caseId: 'case-006',
    status: 'completed',
    score: 75,
    dimensions: {
      identity: { score: 75, weight: 15, details: '' },
      narrative: { score: 75, weight: 20, details: '' },
      actors: { score: 75, weight: 10, details: '' },
      conflicts: { score: 75, weight: 15, details: '' },
      decisionFactors: { score: 75, weight: 15, details: '' },
      risks: { score: 75, weight: 10, details: '' },
      unknowns: { score: 75, weight: 10, details: '' },
      topicDrift: { score: 75, weight: 5, details: '' },
    },
    topicDriftDetected: false,
    errors: [],
  },
}

describe('Case Intelligence benchmark CLI', () => {
  it('parses a case id and supported provider forms', () => {
    expect(parseCaseBenchmarkArgs(['case-006'])).toEqual({ caseId: 'case-006', provider: 'mock' })
    expect(parseCaseBenchmarkArgs(['case-006', '--provider', 'minimax']))
      .toEqual({ caseId: 'case-006', provider: 'minimax' })
    expect(parseCaseBenchmarkArgs(['case-006', '--provider', 'direct-minimax']))
      .toEqual({ caseId: 'case-006', provider: 'direct-minimax' })
    expect(parseCaseBenchmarkArgs(['case-006', '--provider', 'hybrid-minimax']))
      .toEqual({ caseId: 'case-006', provider: 'hybrid-minimax' })
    expect(parseCaseBenchmarkArgs(['case-006', '--provider', 'enhanced-v3-minimax']))
      .toEqual({ caseId: 'case-006', provider: 'enhanced-v3-minimax' })
    expect(parseCaseBenchmarkArgs(['case-006', '--provider', 'enhanced-v4-minimax']))
      .toEqual({ caseId: 'case-006', provider: 'enhanced-v4-minimax' })
    expect(parseCaseBenchmarkArgs(['case-006', '--all']))
      .toEqual({ caseId: 'case-006', all: true })
    expect(parseCaseBenchmarkArgs(['--', 'case-006', '--provider', 'mock']))
      .toEqual({ caseId: 'case-006', provider: 'mock' })
    expect(parseCaseBenchmarkArgs(['--provider=mock', 'case-006']))
      .toEqual({ caseId: 'case-006', provider: 'mock' })
  })

  it('rejects unsupported providers', () => {
    expect(() => parseCaseBenchmarkArgs(['case-006', '--provider', 'other']))
      .toThrow('case_benchmark_provider_unsupported:other')
  })

  it('selects MiniMax, invokes the runner and prints the scoring report location', async () => {
    const run = vi.fn().mockResolvedValue(benchmarkResult)
    const runnerFactory = vi.fn().mockReturnValue({ run })
    const write = vi.fn()

    await runCaseIntelligenceBenchmarkCli(
      ['case-006', '--provider', 'minimax'],
      { runnerFactory, write },
    )

    expect(runnerFactory).toHaveBeenCalledWith('minimax')
    expect(run).toHaveBeenCalledWith('case-006')
    expect(write.mock.calls[0][0]).toContain('"score": 75')
    expect(write.mock.calls[0][0]).toContain('/tmp/evaluation-report.json')
  })

  it('selects direct-minimax and invokes its benchmark runner', async () => {
    const run = vi.fn().mockResolvedValue(benchmarkResult)
    const runnerFactory = vi.fn().mockReturnValue({ run })
    const write = vi.fn()

    await runCaseIntelligenceBenchmarkCli(
      ['case-006', '--provider', 'direct-minimax'],
      { runnerFactory, write },
    )

    expect(runnerFactory).toHaveBeenCalledWith('direct-minimax')
    expect(run).toHaveBeenCalledWith('case-006')
    expect(write.mock.calls[0][0]).toContain('"provider": "direct-minimax"')
  })

  it('selects hybrid-minimax and invokes its benchmark runner', async () => {
    const run = vi.fn().mockResolvedValue(benchmarkResult)
    const runnerFactory = vi.fn().mockReturnValue({ run })
    const write = vi.fn()

    await runCaseIntelligenceBenchmarkCli(
      ['case-006', '--provider', 'hybrid-minimax'],
      { runnerFactory, write },
    )

    expect(runnerFactory).toHaveBeenCalledWith('hybrid-minimax')
    expect(run).toHaveBeenCalledWith('case-006')
    expect(write.mock.calls[0][0]).toContain('"provider": "hybrid-minimax"')
  })

  it('selects enhanced-v3-minimax and invokes its benchmark runner', async () => {
    const run = vi.fn().mockResolvedValue(benchmarkResult)
    const runnerFactory = vi.fn().mockReturnValue({ run })
    const write = vi.fn()

    await runCaseIntelligenceBenchmarkCli(
      ['case-006', '--provider', 'enhanced-v3-minimax'],
      { runnerFactory, write },
    )

    expect(runnerFactory).toHaveBeenCalledWith('enhanced-v3-minimax')
    expect(run).toHaveBeenCalledWith('case-006')
    expect(write.mock.calls[0][0]).toContain('"provider": "enhanced-v3-minimax"')
  })

  it('runs all registered providers and prints a result array', async () => {
    const run = vi.fn().mockResolvedValue(benchmarkResult)
    const runnerFactory = vi.fn().mockReturnValue({ run })
    const write = vi.fn()

    const result = await runCaseIntelligenceBenchmarkCli(
      ['case-006', '--all'],
      { runnerFactory, write },
    )

    expect(runnerFactory.mock.calls.map(([provider]) => provider)).toEqual([
      'mock',
      'minimax',
      'direct-minimax',
      'enhanced-minimax',
      'enhanced-v2-minimax',
      'enhanced-v3-minimax',
      'enhanced-v4-minimax',
      'hybrid-minimax',
    ])
    expect(run).toHaveBeenCalledTimes(8)
    expect(result).toHaveLength(8)
    expect(JSON.parse(write.mock.calls[0][0])).toHaveLength(8)
  })

  it('continues --all after one Provider fails and saves its diagnostics', async () => {
    const resultRoot = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-benchmark-all-failure-'))
    const write = vi.fn()
    const executed: string[] = []
    const runnerFactory = vi.fn((provider: string) => ({
      run: async () => {
        executed.push(provider)
        if (provider === 'hybrid-minimax') {
          throw Object.assign(new Error('hybrid_initial_understanding_invalid'), {
            code: 'hybrid_initial_understanding_invalid',
            failingStage: 'initial_understanding',
            benchmarkDiagnostic: {
              failing_stage: 'initial_understanding',
              schema_validation_error: { code: 'required_string' },
              provider: 'hybrid-minimax',
              model: 'MiniMax-M3',
            },
          })
        }
        return benchmarkResult
      },
    }))

    const results = await runCaseIntelligenceBenchmarkCli(
      ['case-006', '--all'],
      {
        runnerFactory,
        storage: new BenchmarkResultStorage(resultRoot),
        runIdFactory: () => 'run-partial-failure-001',
        write,
      },
    ) as any[]
    const output = JSON.parse(write.mock.calls[0][0])
    const failure = results.find((result) => result.status === 'failed')
    const savedFailure = JSON.parse(await readFile(failure.errorPath, 'utf8'))

    expect(executed).toHaveLength(8)
    expect(results).toHaveLength(8)
    expect(output.filter((result: any) => result.status === 'completed')).toHaveLength(7)
    expect(output.find((result: any) => result.provider === 'hybrid-minimax')).toMatchObject({
      status: 'failed',
      error: { code: 'hybrid_initial_understanding_invalid' },
      failing_stage: 'initial_understanding',
      diagnostic: { provider: 'hybrid-minimax' },
    })
    expect(savedFailure).toMatchObject({
      case_id: 'case-006',
      provider: 'hybrid-minimax',
      status: 'failed',
      failing_stage: 'initial_understanding',
      diagnostic: { schema_validation_error: { code: 'required_string' } },
    })
  })

  it('keeps single Provider mode fail-fast', async () => {
    const failure = Object.assign(new Error('direct_failed'), { failingStage: 'direct_case_model' })
    const runnerFactory = vi.fn().mockReturnValue({ run: vi.fn().mockRejectedValue(failure) })

    await expect(runCaseIntelligenceBenchmarkCli(
      ['case-006', '--provider', 'direct-minimax'],
      { runnerFactory, write: () => undefined },
    )).rejects.toBe(failure)
  })

  it('formats validation diagnostics for CLI output', () => {
    const error = Object.assign(new Error('case_model_invalid'), {
      benchmarkDiagnostic: {
        failing_stage: 'identity',
        schema_validation_error: { code: 'required_string' },
        raw_ai_response_path: '/tmp/raw-ai-response.json',
        provider: 'minimax',
        model: 'MiniMax-M3',
      },
    })
    expect(formatCaseBenchmarkError(error)).toContain('"failing_stage": "identity"')
    expect(formatCaseBenchmarkError(error)).toContain('raw-ai-response.json')
  })
})
