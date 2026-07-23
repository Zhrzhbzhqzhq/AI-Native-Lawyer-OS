import { createHash, randomUUID } from 'node:crypto'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

function safeMatterKey(matterId: string) {
  const readable = matterId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'matter'
  return `${readable}-${createHash('sha256').update(matterId).digest('hex').slice(0, 12)}`
}

export class LawUnderstandingArtifactStore {
  private readonly repositoryRoot: string

  constructor(repositoryRoot = path.resolve(__dirname, '../../../../..')) {
    this.repositoryRoot = path.resolve(repositoryRoot)
  }

  async createRun(matterId: string, runId = randomUUID()) {
    if (!/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error('law_artifact_run_id_invalid')
    const directory = path.join(this.repositoryRoot, 'storage/context-engine-c0.6/law-understanding', safeMatterKey(matterId), runId)
    await mkdir(directory, { recursive: true })
    const uri = (name: string) => path.relative(this.repositoryRoot, path.join(directory, name)).split(path.sep).join('/')
    return {
      runId,
      directory,
      inputUri: uri('law-input.json'),
      rawResponseUri: uri('raw-ai-response.json'),
      resultUri: uri('law-drafts.json'),
    }
  }

  saveInput(run: { directory: string }, value: unknown) { return this.writeJson(path.join(run.directory, 'law-input.json'), value) }
  saveRawResponse(run: { directory: string }, value: unknown) { return this.writeJson(path.join(run.directory, 'raw-ai-response.json'), value) }
  saveResult(run: { directory: string }, value: unknown) { return this.writeJson(path.join(run.directory, 'law-drafts.json'), value) }

  private async writeJson(target: string, value: unknown) {
    const temporary = `${target}.${randomUUID()}.tmp`
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
    await rename(temporary, target)
  }
}

export default LawUnderstandingArtifactStore

