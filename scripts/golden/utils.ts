import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'

export const repoRoot = path.resolve(__dirname, '..', '..')
export const goldenRoot = path.join(repoRoot, 'test-data', 'golden')

export function datasetConfig() {
  return readJson<any>(path.join(goldenRoot, 'dataset.json'))
}

export function gitCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim() || null
  } catch {
    return null
  }
}

export function requireGoldenDatabaseName() {
  const value = process.env.GOLDEN_DATABASE_NAME
  if (!value) throw new Error('GOLDEN_DATABASE_NAME_required')
  if (value !== 'lawdesk_rc_test') throw new Error(`unsafe_golden_database:${value}`)
  return value
}

export function readJson<T = any>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

export function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true })
}

export function assertFile(filePath: string, label: string) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`)
}

export function listMaterialFiles(caseDir: string) {
  const materialsDir = path.join(caseDir, 'materials')
  return fs.readdirSync(materialsDir)
    .filter((name) => name.endsWith('.md') || name.endsWith('.txt') || name.endsWith('.json'))
    .sort()
    .map((name) => ({
      name,
      path: path.join(materialsDir, name),
      content: fs.readFileSync(path.join(materialsDir, name), 'utf8'),
    }))
}

export function makeRunId() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
}

export function textOf(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function compact(value: unknown, max = 600): string {
  const text = textOf(value).replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max)}...` : text
}

export function includesAny(text: string, terms: string[]) {
  const normalized = String(text || '').toLowerCase()
  return terms.filter((term) => normalized.includes(String(term).toLowerCase()))
}

export function latestRunDir(caseDir: string) {
  const runsDir = path.join(caseDir, 'runs')
  if (!fs.existsSync(runsDir)) throw new Error(`runs directory not found: ${runsDir}`)
  const runs = fs.readdirSync(runsDir)
    .filter((name) => name !== '.gitkeep' && fs.statSync(path.join(runsDir, name)).isDirectory())
    .sort()
  if (runs.length === 0) throw new Error('no golden runs found')
  return path.join(runsDir, runs[runs.length - 1])
}

export function parseCliArgs(argv: string[]) {
  const positional: string[] = []
  const flags: Record<string, string | boolean> = {}
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const body = arg.slice(2)
      const eq = body.indexOf('=')
      if (eq >= 0) flags[body.slice(0, eq)] = body.slice(eq + 1)
      else flags[body] = true
    } else {
      positional.push(arg)
    }
  }
  return { positional, flags }
}

export function caseDirFor(caseId: string) {
  const dataset = datasetConfig()
  const allowed = Array.isArray(dataset.cases) ? dataset.cases.some((item: any) => item?.case_id === caseId) : false
  if (!allowed) throw new Error(`unknown_golden_case:${caseId}`)
  return path.join(goldenRoot, caseId)
}
