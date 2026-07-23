import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { assertCaseBenchmarkFixtureBoundary } from '../CaseBenchmarkFixtureValidator'
import CaseModelValidator from '../CaseModelValidator'
import type {
  BenchmarkCase,
  BenchmarkManifest,
} from './types/benchmark.types'
import type {
  CaseIntelligenceInput,
  CaseModel,
} from '../types/caseModel.types'

const MANIFEST_FILE = 'benchmark-manifest.json'

function defaultBenchmarkRoot(): string {
  const fromWorkspace = path.resolve(process.cwd(), 'test-data/case-intelligence-benchmark')
  if (existsSync(fromWorkspace)) return fromWorkspace
  return path.resolve(process.cwd(), '../../test-data/case-intelligence-benchmark')
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

function parseManifest(value: unknown): BenchmarkManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('benchmark_manifest_invalid')
  }
  const manifest = value as Record<string, unknown>
  if (manifest.version !== '1.0') throw new Error('benchmark_manifest_version_unsupported')
  if (!Array.isArray(manifest.cases)
    || !manifest.cases.every((caseId) => typeof caseId === 'string' && /^case-\d{3}$/.test(caseId))) {
    throw new Error('benchmark_manifest_cases_invalid')
  }
  if (new Set(manifest.cases).size !== manifest.cases.length) {
    throw new Error('benchmark_manifest_cases_duplicate')
  }
  return { version: '1.0', cases: manifest.cases }
}

function parseCaseInput(value: unknown): CaseIntelligenceInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('case_benchmark_input_invalid')
  }
  const input = value as Record<string, unknown>
  if (typeof input.case_id !== 'string' || !input.case_id.trim()
    || typeof input.title !== 'string' || !input.title.trim()
    || !('context' in input)) {
    throw new Error('case_benchmark_input_invalid')
  }
  return { case_id: input.case_id, title: input.title, context: input.context }
}

function parseGoldenCaseModel(value: unknown): CaseModel {
  const validation = new CaseModelValidator().validate(value)
  if (validation.ok) return value as CaseModel
  const error = new Error('case_benchmark_golden_invalid')
  ;(error as any).validation = validation
  throw error
}

export class BenchmarkCaseLoader {
  constructor(private readonly benchmarkRoot = defaultBenchmarkRoot()) {}

  async loadManifest(): Promise<BenchmarkManifest> {
    return parseManifest(await readJson(path.join(this.benchmarkRoot, MANIFEST_FILE)))
  }

  async loadCasesFromManifest(): Promise<readonly BenchmarkCase[]> {
    const manifest = await this.loadManifest()
    return Promise.all(manifest.cases.map((caseId) => this.load(caseId)))
  }

  async listCaseIds(): Promise<readonly string[]> {
    return (await this.loadManifest()).cases
  }

  async load(caseId: string): Promise<BenchmarkCase> {
    const normalizedCaseId = String(caseId || '').trim()
    if (!/^case-\d{3}$/.test(normalizedCaseId)) throw new Error('case_benchmark_id_invalid')

    const v2CaseDirectory = path.join(this.benchmarkRoot, 'cases', normalizedCaseId)
    const legacyCaseDirectory = path.join(this.benchmarkRoot, normalizedCaseId)
    const caseDirectory = existsSync(v2CaseDirectory) ? v2CaseDirectory : legacyCaseDirectory
    const input = parseCaseInput(await readJson(path.join(caseDirectory, 'case-input.json')))
    const goldenCaseModel = parseGoldenCaseModel(
      await readJson(path.join(caseDirectory, 'golden-case-model.json')),
    )
    if (input.case_id !== normalizedCaseId) throw new Error('case_benchmark_input_id_mismatch')
    assertCaseBenchmarkFixtureBoundary(normalizedCaseId, { input, golden: goldenCaseModel })
    return { caseId: normalizedCaseId, input, goldenCaseModel }
  }
}

export default BenchmarkCaseLoader
