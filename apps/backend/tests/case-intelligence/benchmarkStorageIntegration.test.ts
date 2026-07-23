import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import ProviderRegistry from '../../src/services/case-intelligence/benchmark/ProviderRegistry'
import BenchmarkResultStorage from '../../src/services/case-intelligence/benchmark/storage/BenchmarkResultStorage'
import type { BenchmarkProviderId } from '../../src/services/case-intelligence/benchmark/types/benchmark.types'
import { runCaseIntelligenceBenchmarkCli } from '../../src/services/case-intelligence/cli/CaseIntelligenceBenchmarkCli'
import type { CaseModel } from '../../src/services/case-intelligence/types/caseModel.types'

const fixtureRoot = path.resolve(__dirname, '../../../../test-data/case-intelligence-benchmark/case-006')

async function createBenchmarkRoot(): Promise<{ root: string; golden: CaseModel }> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-benchmark-storage-chain-'))
  const caseDirectory = path.join(root, 'case-006')
  await mkdir(caseDirectory, { recursive: true })
  const input = await readFile(path.join(fixtureRoot, 'case-input.json'), 'utf8')
  const goldenText = await readFile(path.join(fixtureRoot, 'golden-case-model.json'), 'utf8')
  await writeFile(path.join(caseDirectory, 'case-input.json'), input, 'utf8')
  await writeFile(path.join(caseDirectory, 'golden-case-model.json'), goldenText, 'utf8')
  return { root, golden: JSON.parse(goldenText) as CaseModel }
}

function registryWith(golden: CaseModel, providerIds: BenchmarkProviderId[]): ProviderRegistry {
  const registry = new ProviderRegistry()
  for (const providerId of providerIds) {
    registry.register({
      id: providerId,
      model: `model-${providerId}`,
      generateCaseModel: async () => structuredClone(golden),
    })
  }
  return registry
}

describe('Case Intelligence benchmark storage integration', () => {
  it('generates Direct base once and shares it across enhanced Providers', async () => {
    const fixture = await createBenchmarkRoot()
    const resultRoot = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-benchmark-base-cache-'))
    const storage = new BenchmarkResultStorage(resultRoot)
    const registry = new ProviderRegistry()
    let directCalls = 0
    const enhancedBases: CaseModel[] = []

    registry.register({
      id: 'direct-minimax',
      model: 'MiniMax-M3',
      usesDirectBase: true,
      generateCaseModel: async (_input, context) => {
        if (context?.baseCaseModel) return structuredClone(context.baseCaseModel)
        directCalls += 1
        return structuredClone(fixture.golden)
      },
    })
    for (const providerId of ['enhanced-v2-minimax', 'enhanced-v4-minimax'] as const) {
      registry.register({
        id: providerId,
        model: 'MiniMax-M3',
        usesDirectBase: true,
        generateCaseModel: async (_input, context) => {
          if (!context?.baseCaseModel) throw new Error('base_case_model_required')
          enhancedBases.push(structuredClone(context.baseCaseModel))
          return structuredClone(context.baseCaseModel)
        },
      })
    }

    const results = await runCaseIntelligenceBenchmarkCli(
      ['case-006', '--all'],
      {
        registry,
        storage,
        benchmarkRoot: fixture.root,
        runIdFactory: () => 'run-shared-base-001',
        write: () => undefined,
      },
    ) as any[]

    expect(directCalls).toBe(1)
    expect(enhancedBases).toHaveLength(2)
    expect(enhancedBases[0]).toEqual(fixture.golden)
    expect(enhancedBases[1]).toEqual(fixture.golden)
    expect(new Set(results.map((result) => result.baseCaseModelPath))).toEqual(new Set([
      path.join(resultRoot, 'run-shared-base-001', 'case-006', 'base-case-model.json'),
    ]))
    await expect(readFile(results[0].baseCaseModelPath, 'utf8'))
      .resolves.toContain(fixture.golden.identity.title)
  })

  it('does not overwrite two runs of the same Provider', async () => {
    const fixture = await createBenchmarkRoot()
    const resultRoot = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-benchmark-history-chain-'))
    const storage = new BenchmarkResultStorage(resultRoot)
    const registry = registryWith(fixture.golden, ['direct-minimax'])
    const runIds = ['run-direct-001', 'run-direct-002']
    const dependencies = {
      registry,
      storage,
      benchmarkRoot: fixture.root,
      runIdFactory: () => runIds.shift()!,
      write: () => undefined,
    }

    const first = await runCaseIntelligenceBenchmarkCli(
      ['case-006', '--provider', 'direct-minimax'],
      dependencies,
    ) as any
    const second = await runCaseIntelligenceBenchmarkCli(
      ['case-006', '--provider', 'direct-minimax'],
      dependencies,
    ) as any

    expect(first.caseModelPath).toContain(path.join('run-direct-001', 'case-006', 'direct-minimax'))
    expect(second.caseModelPath).toContain(path.join('run-direct-002', 'case-006', 'direct-minimax'))
    expect(first.caseModelPath).not.toBe(second.caseModelPath)
    await expect(access(first.caseModelPath)).resolves.toBeUndefined()
    await expect(access(second.caseModelPath)).resolves.toBeUndefined()
  })

  it('isolates different Providers under one --all run', async () => {
    const fixture = await createBenchmarkRoot()
    const resultRoot = await mkdtemp(path.join(os.tmpdir(), 'lawdesk-benchmark-provider-chain-'))
    const storage = new BenchmarkResultStorage(resultRoot)
    const registry = registryWith(fixture.golden, ['direct-minimax', 'hybrid-minimax'])

    const results = await runCaseIntelligenceBenchmarkCli(
      ['case-006', '--all'],
      {
        registry,
        storage,
        benchmarkRoot: fixture.root,
        runIdFactory: () => 'run-all-001',
        write: () => undefined,
      },
    ) as any[]

    expect(results).toHaveLength(2)
    expect(results[0].caseModelPath).toContain(path.join('run-all-001', 'case-006', 'direct-minimax'))
    expect(results[1].caseModelPath).toContain(path.join('run-all-001', 'case-006', 'hybrid-minimax'))
    expect(results[0].caseModelPath).not.toBe(results[1].caseModelPath)
    await expect(access(results[0].runtimePath)).resolves.toBeUndefined()
    await expect(access(results[1].runtimePath)).resolves.toBeUndefined()
  })
})
