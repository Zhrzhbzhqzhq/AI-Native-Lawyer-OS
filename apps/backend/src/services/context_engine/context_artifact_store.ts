import { createHash, randomUUID } from 'node:crypto'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { CaseUnderstandingGeneration } from './case_understanding_generator'

export type ContextArtifactStoreOptions = {
  repositoryRoot?: string
}

export type ContextArtifactRun = {
  runId: string
  matterId: string
  directory: string
  artifacts: {
    contextSnapshot: string
    rawAIResponse: string
    caseUnderstanding: string
  }
}

function defaultRepositoryRoot() {
  return path.resolve(__dirname, '../../../../..')
}

function safeMatterKey(matterId: string) {
  const readable = matterId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'matter'
  const hash = createHash('sha256').update(matterId).digest('hex').slice(0, 12)
  return `${readable}-${hash}`
}

function safeRunId(runId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error('context_artifact_run_id_invalid')
  return runId
}

export class ContextArtifactStore {
  private readonly repositoryRoot: string
  private readonly artifactRoot: string

  constructor(options: ContextArtifactStoreOptions = {}) {
    this.repositoryRoot = path.resolve(options.repositoryRoot || defaultRepositoryRoot())
    this.artifactRoot = path.join(this.repositoryRoot, 'storage/context-engine-c0.1')
  }

  async createRun(matterId: string, requestedRunId = randomUUID()): Promise<ContextArtifactRun> {
    const normalizedMatterId = String(matterId || '').trim()
    if (!normalizedMatterId) throw new Error('matter_id_required')
    const runId = safeRunId(requestedRunId)
    const directory = path.join(this.artifactRoot, safeMatterKey(normalizedMatterId), runId)
    await mkdir(directory, { recursive: true })
    const uri = (filename: string) => path.relative(this.repositoryRoot, path.join(directory, filename)).split(path.sep).join('/')
    return {
      runId,
      matterId: normalizedMatterId,
      directory,
      artifacts: {
        contextSnapshot: uri('context-snapshot.json'),
        rawAIResponse: uri('raw-ai-response.json'),
        caseUnderstanding: uri('case-understanding.json'),
      },
    }
  }

  saveContextSnapshot(run: ContextArtifactRun, value: unknown) {
    return this.writeJson(path.join(run.directory, 'context-snapshot.json'), value)
  }

  saveRawAIResponse(run: ContextArtifactRun, value: unknown) {
    return this.writeJson(path.join(run.directory, 'raw-ai-response.json'), value)
  }

  saveCaseUnderstanding(run: ContextArtifactRun, value: unknown) {
    return this.writeJson(path.join(run.directory, 'case-understanding.json'), value)
  }

  async saveGeneration(run: ContextArtifactRun, generation: CaseUnderstandingGeneration) {
    const rawArtifact = {
      status: generation.ok ? 'ready' : 'failed',
      provider: generation.provider,
      model: generation.model,
      promptLength: generation.promptLength,
      rawResponse: generation.rawResponse,
      ...(!generation.ok ? { error: generation.error } : {}),
    }
    const resultArtifact = generation.ok
      ? generation.result
      : {
          status: 'failed',
          matterId: run.matterId,
          runId: run.runId,
          provider: generation.provider,
          model: generation.model,
          error: generation.error,
        }
    await Promise.all([
      this.saveRawAIResponse(run, rawArtifact),
      this.saveCaseUnderstanding(run, resultArtifact),
    ])
  }

  private async writeJson(target: string, value: unknown) {
    const temporary = `${target}.${randomUUID()}.tmp`
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
    await rename(temporary, target)
  }
}

export default ContextArtifactStore
