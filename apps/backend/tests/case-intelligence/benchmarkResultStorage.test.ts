import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import BenchmarkResultStorage from '../../src/services/case-intelligence/benchmark/storage/BenchmarkResultStorage'
import type { BenchmarkRunResult } from '../../src/services/case-intelligence/benchmark/types/benchmark.types'

const result: BenchmarkRunResult = {
  runId: 'run-2026-07-21-001',
  caseId: 'case-006',
  providerId: 'direct-minimax',
  caseModel: {
    identity: { caseId: 'case-006', title: '测试案件', caseType: '合同纠纷', stage: '审查', jurisdiction: '中国' },
    narrative: { summary: '案件摘要', background: '案件背景', currentPosture: '材料审查' },
    actors: [],
    timeline: [],
    conflicts: [],
    decisionFactors: [],
    risks: [],
    unknowns: [],
    selfReview: { confidence: 0.8, limitations: [], assumptions: [], requiresLawyerReview: true },
  },
  evaluation: {
    caseId: 'case-006',
    status: 'completed',
    score: 90,
    dimensions: {
      identity: { score: 100, weight: 15, details: 'complete' },
      narrative: { score: 90, weight: 20, details: 'complete' },
      actors: { score: 80, weight: 10, details: 'complete' },
      conflicts: { score: 90, weight: 15, details: 'complete' },
      decisionFactors: { score: 90, weight: 15, details: 'complete' },
      risks: { score: 90, weight: 10, details: 'complete' },
      unknowns: { score: 90, weight: 10, details: 'complete' },
      topicDrift: { score: 100, weight: 5, details: 'none' },
    },
    topicDriftDetected: false,
    errors: [],
  },
  runtime: {
    model: 'MiniMax-M3',
    durationMs: 1234,
    completedAt: '2026-07-21T00:00:00.000Z',
  },
}

describe('BenchmarkResultStorage', () => {
  it('saves and reads a benchmark run result in its immutable directory', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-benchmark-results-'))
    const storage = new BenchmarkResultStorage(root)

    await storage.save(result)

    const directory = path.join(root, result.runId, result.caseId, result.providerId)
    await expect(readFile(path.join(directory, 'case-model.json'), 'utf8')).resolves.toContain('测试案件')
    await expect(readFile(path.join(directory, 'evaluation-report.json'), 'utf8')).resolves.toContain('"score": 90')
    await expect(readFile(path.join(directory, 'runtime.json'), 'utf8')).resolves.toContain('"durationMs": 1234')
    await expect(storage.read(result.runId, result.caseId, result.providerId)).resolves.toEqual(result)
  })

  it('does not overwrite an existing provider result', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-benchmark-history-'))
    const storage = new BenchmarkResultStorage(root)
    await storage.save(result)

    await expect(storage.save({
      ...result,
      runtime: { ...result.runtime, durationMs: 9999 },
    })).rejects.toThrow('benchmark_result_already_exists')

    await expect(storage.read(result.runId, result.caseId, result.providerId))
      .resolves.toEqual(result)
  })

  it('stores and reads a raw AI response when one exists', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-benchmark-raw-'))
    const storage = new BenchmarkResultStorage(root)
    const withRawResponse = {
      ...result,
      runId: 'run-with-raw-response',
      rawAIResponse: { provider: 'direct-minimax', responses: [{ content: '{}' }] },
    }

    const paths = await storage.save(withRawResponse)

    await expect(readFile(paths.rawAIResponsePath!, 'utf8')).resolves.toContain('direct-minimax')
    await expect(storage.read(withRawResponse.runId, result.caseId, result.providerId))
      .resolves.toEqual(withRawResponse)
  })

  it('stores and reads decision factor review metadata', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-benchmark-review-'))
    const storage = new BenchmarkResultStorage(root)
    const withReview = {
      ...result,
      runId: 'run-with-decision-factor-review',
      decisionFactorReview: [{
        decisionFactorId: 'factor-1',
        supportStatus: 'supported' as const,
        sourceRefs: ['material-contract'],
        notes: '合同材料支持该因素。',
      }],
    }

    const paths = await storage.save(withReview)

    expect(path.basename(paths.decisionFactorReviewPath!)).toBe('decision-factor-review.json')
    await expect(readFile(paths.decisionFactorReviewPath!, 'utf8')).resolves.toContain('factor-1')
    await expect(storage.read(withReview.runId, result.caseId, result.providerId))
      .resolves.toEqual(withReview)
  })

  it('stores and reads every Enhancement CaseModel stage', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-benchmark-enhancement-stages-'))
    const storage = new BenchmarkResultStorage(root)
    const afterConflictEnhancement = structuredClone(result.caseModel)
    afterConflictEnhancement.conflicts = [{
      id: 'conflict-debug',
      title: '调试冲突',
      description: '冲突阶段快照',
      actorIds: [],
    }]
    const afterDecisionFactorEnhancement = structuredClone(afterConflictEnhancement)
    afterDecisionFactorEnhancement.decisionFactors = [{
      id: 'factor-debug',
      label: '调试因素',
      description: '决策因素阶段快照',
      impact: 'uncertain',
    }]
    const withStages = {
      ...result,
      runId: 'run-with-enhancement-stages',
      afterConflictEnhancement,
      afterDecisionFactorEnhancement,
      afterReview: structuredClone(afterDecisionFactorEnhancement),
    }

    const paths = await storage.save(withStages)
    const loaded = await storage.read(withStages.runId, result.caseId, result.providerId)

    expect(path.basename(paths.afterConflictEnhancementPath!))
      .toBe('after-conflict-enhancement.json')
    expect(path.basename(paths.afterDecisionFactorEnhancementPath!))
      .toBe('after-decision-factor-enhancement.json')
    expect(path.basename(paths.afterReviewPath!)).toBe('after-review.json')
    expect(loaded).toEqual(withStages)
  })

  it('rejects path traversal identifiers', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-benchmark-path-'))
    const storage = new BenchmarkResultStorage(root)

    await expect(storage.save({ ...result, runId: '../outside' }))
      .rejects.toThrow('benchmark_result_run_id_invalid')
  })
})
