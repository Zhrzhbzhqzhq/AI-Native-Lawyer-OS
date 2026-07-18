import fs from 'fs'
import path from 'path'
import type { GoldenEvaluation, GoldenImport } from './types'

const DEFAULT_DATASET_ROOT = path.resolve(__dirname, '../../../../..', 'test-data', 'golden-dataset')

function assertGoldenId(goldenId: string) {
  const value = String(goldenId || '').trim()
  if (!value || value === '.' || value === '..' || value.includes('/') || value.includes('\\')) {
    throw new Error('invalid_golden_id')
  }
  return value
}

function readJsonObject<T extends Record<string, unknown>>(filePath: string, errorCode: string): T {
  if (!fs.existsSync(filePath)) throw new Error(`${errorCode}:${filePath}`)

  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    throw new Error(`${errorCode}_invalid_json:${filePath}`)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${errorCode}_invalid_structure:${filePath}`)
  }
  return parsed as T
}

export class GoldenLoader {
  constructor(private readonly datasetRoot = DEFAULT_DATASET_ROOT) {}

  caseDirectory(goldenId: string) {
    return path.join(this.datasetRoot, assertGoldenId(goldenId))
  }

  loadImport(goldenId: string): GoldenImport {
    return readJsonObject<GoldenImport>(path.join(this.caseDirectory(goldenId), 'import.json'), 'golden_import_not_found')
  }

  loadEvaluation(goldenId: string): GoldenEvaluation {
    return readJsonObject<GoldenEvaluation>(path.join(this.caseDirectory(goldenId), 'evaluation.json'), 'golden_evaluation_not_found')
  }
}
