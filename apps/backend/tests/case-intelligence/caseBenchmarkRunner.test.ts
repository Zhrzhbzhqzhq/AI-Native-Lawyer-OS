import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import CaseBenchmarkRunner from '../../src/services/case-intelligence/CaseBenchmarkRunner'
import CaseChiefService from '../../src/services/case-intelligence/CaseChiefService'
import CaseEvaluationService from '../../src/services/case-intelligence/CaseEvaluationService'
import BenchmarkResultStorage from '../../src/services/case-intelligence/benchmark/storage/BenchmarkResultStorage'
import { CaseChiefPipeline, MockCaseIntelligenceProvider } from '../../src/services/case-intelligence/pipeline'
import type { CaseModel } from '../../src/services/case-intelligence/types/caseModel.types'

const fixtureRoot = path.resolve(__dirname, '../../../../test-data/case-intelligence-benchmark')

async function fixture(name: string) {
  return JSON.parse(await readFile(path.join(fixtureRoot, 'case-006', name), 'utf8'))
}

function providerResponses(model: CaseModel) {
  return {
    identity: model.identity,
    narrative: model.narrative,
    actor: { actors: model.actors, timeline: model.timeline },
    conflict: model.conflicts,
    factor: model.decisionFactors,
    risk: model.risks,
    review: { unknowns: model.unknowns, selfReview: model.selfReview },
  }
}

describe('CaseBenchmarkRunner case-006', () => {
  it('reads the fixture, generates CaseModel, saves JSON and writes an evaluation report', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-case-benchmark-'))
    const caseDirectory = path.join(root, 'case-006')
    await mkdir(caseDirectory, { recursive: true })
    await writeFile(path.join(caseDirectory, 'case-input.json'), JSON.stringify(await fixture('case-input.json')), 'utf8')
    const golden = await fixture('golden-case-model.json') as CaseModel
    await writeFile(path.join(caseDirectory, 'golden-case-model.json'), JSON.stringify(golden), 'utf8')

    const provider = new MockCaseIntelligenceProvider(providerResponses(golden))
    const chief = new CaseChiefService(new CaseChiefPipeline(provider))
    const result = await new CaseBenchmarkRunner(chief, new CaseEvaluationService(), root).run('case-006')

    expect(result.model).toEqual(golden)
    expect(result.evaluation.status).toBe('completed')
    expect(result.evaluation.score).toBe(100)
    await expect(readFile(result.caseModelPath, 'utf8')).resolves.toContain('陈伟诉李强股权转让合同纠纷')
    const report = JSON.parse(await readFile(result.evaluationReportPath, 'utf8'))
    expect(report).toMatchObject({ caseId: 'case-006', status: 'completed', score: 100 })
  })

  it('normalizes Provider jurisdiction before validation and evaluation', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-case-benchmark-normalizer-'))
    const caseDirectory = path.join(root, 'case-006')
    await mkdir(caseDirectory, { recursive: true })
    await writeFile(path.join(caseDirectory, 'case-input.json'), JSON.stringify(await fixture('case-input.json')), 'utf8')
    const golden = await fixture('golden-case-model.json') as CaseModel
    await writeFile(path.join(caseDirectory, 'golden-case-model.json'), JSON.stringify(golden), 'utf8')
    const providerModel = structuredClone(golden) as any
    providerModel.identity.jurisdiction = null

    const result = await new CaseBenchmarkRunner(
      { generateCaseModel: async () => providerModel },
      new CaseEvaluationService(),
      root,
    ).run('case-006')

    expect(result.model.identity.jurisdiction).toBe('unknown')
    await expect(readFile(result.caseModelPath, 'utf8')).resolves.toContain('"jurisdiction": "unknown"')
  })

  it('saves Provider decision factor review artifacts with the benchmark result', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-case-benchmark-review-fixture-'))
    const resultRoot = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-case-benchmark-review-result-'))
    const caseDirectory = path.join(root, 'case-006')
    await mkdir(caseDirectory, { recursive: true })
    await writeFile(path.join(caseDirectory, 'case-input.json'), JSON.stringify(await fixture('case-input.json')), 'utf8')
    const golden = await fixture('golden-case-model.json') as CaseModel
    await writeFile(path.join(caseDirectory, 'golden-case-model.json'), JSON.stringify(golden), 'utf8')
    const review = [{
      decisionFactorId: golden.decisionFactors[0].id,
      supportStatus: 'supported' as const,
      sourceRefs: ['material-006-1'],
      notes: '合同材料支持该因素。',
    }]
    const provider = {
      generateCaseModel: async () => structuredClone(golden),
      artifacts: () => ({ decisionFactorReview: review }),
    }

    const result = await new CaseBenchmarkRunner(
      provider,
      new CaseEvaluationService(),
      root,
      undefined,
      {
        storage: new BenchmarkResultStorage(resultRoot),
        runId: 'run-review-001',
        providerId: 'enhanced-v4-minimax',
        model: 'MiniMax-M3',
      },
    ).run('case-006')

    expect(path.basename(result.decisionFactorReviewPath!)).toBe('decision-factor-review.json')
    await expect(readFile(result.decisionFactorReviewPath!, 'utf8')).resolves.toContain('material-006-1')
  })

  it('saves raw AI diagnostics when CaseModel validation fails', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-case-benchmark-failure-'))
    const caseDirectory = path.join(root, 'case-006')
    await mkdir(caseDirectory, { recursive: true })
    await writeFile(path.join(caseDirectory, 'case-input.json'), JSON.stringify(await fixture('case-input.json')), 'utf8')
    await writeFile(path.join(caseDirectory, 'golden-case-model.json'), JSON.stringify(await fixture('golden-case-model.json')), 'utf8')
    const validationError = Object.assign(new Error('case_model_invalid'), {
      code: 'case_model_invalid',
      failingStage: 'case_model',
      validation: { ok: false, issues: [{ path: 'identity', code: 'required_string', message: 'identity is invalid' }] },
    })
    const caseChief = { generateCaseModel: async () => { throw validationError } }
    const diagnostics = () => ({
      provider: 'minimax',
      model: 'MiniMax-M3',
      responses: [{ stage: 'identity', response: { choices: [] } }],
    })
    const runner = new CaseBenchmarkRunner(caseChief, new CaseEvaluationService(), root, diagnostics)

    await expect(runner.run('case-006')).rejects.toMatchObject({
      benchmarkDiagnostic: {
        failing_stage: 'case_model',
        provider: 'minimax',
        model: 'MiniMax-M3',
      },
    })
    const rawPath = path.join(caseDirectory, 'outputs/raw-ai-response.json')
    const raw = JSON.parse(await readFile(rawPath, 'utf8'))
    expect(raw).toMatchObject({ provider: 'minimax', model: 'MiniMax-M3' })
    expect(raw.responses).toHaveLength(1)
  })

  it('saves and reads stage-separated Enhancement raw responses', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-case-benchmark-enhancement-raw-'))
    const resultRoot = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-case-benchmark-enhancement-result-'))
    const caseDirectory = path.join(root, 'case-006')
    await mkdir(caseDirectory, { recursive: true })
    await writeFile(path.join(caseDirectory, 'case-input.json'), JSON.stringify(await fixture('case-input.json')), 'utf8')
    const golden = await fixture('golden-case-model.json') as CaseModel
    await writeFile(path.join(caseDirectory, 'golden-case-model.json'), JSON.stringify(golden), 'utf8')
    const responses = [
      { stage: 'direct', response: { content: 'direct raw response' } },
      { stage: 'conflict-enhancement', response: { content: 'conflict raw response' } },
      { stage: 'decision-factor-enhancement', response: { content: 'factor raw response' } },
    ]
    const storage = new BenchmarkResultStorage(resultRoot)
    const runner = new CaseBenchmarkRunner(
      { generateCaseModel: async () => structuredClone(golden) },
      new CaseEvaluationService(),
      root,
      () => ({ provider: 'enhanced-v2-minimax', model: 'MiniMax-M3', responses }),
      {
        storage,
        runId: 'run-enhancement-raw-001',
        providerId: 'enhanced-v2-minimax',
        model: 'MiniMax-M3',
      },
    )

    const result = await runner.run('case-006')
    const saved = JSON.parse(await readFile(result.rawAIResponsePath!, 'utf8'))
    const artifact = await storage.read(
      'run-enhancement-raw-001',
      'case-006',
      'enhanced-v2-minimax',
    )

    expect(saved.responses).toEqual(responses)
    expect(saved.responses.map((entry: any) => entry.stage)).toEqual([
      'direct',
      'conflict-enhancement',
      'decision-factor-enhancement',
    ])
    expect(artifact.rawAIResponse).toEqual({
      provider: 'enhanced-v2-minimax',
      model: 'MiniMax-M3',
      responses,
    })
  })

  it('keeps completed Enhancement stage snapshots when a later stage fails', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-case-benchmark-stage-failure-'))
    const resultRoot = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-case-benchmark-stage-failure-result-'))
    const caseDirectory = path.join(root, 'case-006')
    await mkdir(caseDirectory, { recursive: true })
    await writeFile(path.join(caseDirectory, 'case-input.json'), JSON.stringify(await fixture('case-input.json')), 'utf8')
    const golden = await fixture('golden-case-model.json') as CaseModel
    await writeFile(path.join(caseDirectory, 'golden-case-model.json'), JSON.stringify(golden), 'utf8')
    const afterConflictEnhancement = structuredClone(golden)
    afterConflictEnhancement.conflicts[0].title = '冲突阶段已完成'
    const error = Object.assign(new Error('enhancement_fact_invalid'), {
      failingStage: 'enhancement_fact_validation',
    })
    const provider = {
      generateCaseModel: async () => { throw error },
      artifacts: () => ({ afterConflictEnhancement }),
    }
    const runner = new CaseBenchmarkRunner(
      provider,
      new CaseEvaluationService(),
      root,
      () => ({ provider: 'enhanced-v2-minimax', model: 'MiniMax-M3', responses: [] }),
      {
        storage: new BenchmarkResultStorage(resultRoot),
        runId: 'run-stage-failure-001',
        providerId: 'enhanced-v2-minimax',
        model: 'MiniMax-M3',
      },
    )

    await expect(runner.run('case-006')).rejects.toBe(error)
    const stagePath = path.join(
      resultRoot,
      'run-stage-failure-001',
      'case-006',
      'enhanced-v2-minimax',
      'after-conflict-enhancement.json',
    )
    await expect(readFile(stagePath, 'utf8')).resolves.toContain('冲突阶段已完成')
  })
})
