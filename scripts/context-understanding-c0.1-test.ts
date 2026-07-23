import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnvironment } from 'dotenv'
import { createPrismaClient } from '@lawdesk/database'
import CaseUnderstandingGenerator from '../apps/backend/src/services/context_engine/case_understanding_generator'
import ContextArtifactStore from '../apps/backend/src/services/context_engine/context_artifact_store'
import MinimalContextBuilder from '../apps/backend/src/services/context_engine/minimal_context_builder'
import SafeMaterialReader from '../apps/backend/src/services/context_engine/safe_material_reader'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const environment = loadEnvironment({
  path: path.join(repositoryRoot, 'apps/backend/.env'),
  override: true,
})

if (environment.error) throw environment.error

async function main() {
  const matterId = String(process.argv.slice(2).find((argument) => argument !== '--') || '').trim()
  if (!matterId) throw new Error('usage: pnpm exec tsx scripts/context-understanding-c0.1-test.ts <matterId>')

  const prisma = createPrismaClient()
  try {
    const reader = new SafeMaterialReader({ repositoryRoot })
    const snapshot = await new MinimalContextBuilder(prisma, reader).build(matterId)
    const store = new ContextArtifactStore({ repositoryRoot })
    const run = await store.createRun(matterId)
    await store.saveContextSnapshot(run, snapshot)

    const generation = snapshot.completeness.complete
      ? await new CaseUnderstandingGenerator().generate(snapshot)
      : {
          ok: false as const,
          provider: 'minimax' as const,
          model: process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3',
          promptLength: 0,
          rawResponse: null,
          error: {
            code: 'context_snapshot_incomplete',
            message: 'One or more Matter materials could not be read completely.',
          },
        }
    await store.saveGeneration(run, generation)

    process.stdout.write(`${JSON.stringify({
      runId: run.runId,
      matterId,
      status: generation.ok ? 'ready' : 'failed',
      provider: generation.provider,
      model: generation.model,
      promptLength: generation.promptLength,
      artifacts: run.artifacts,
      ...(generation.ok ? { caseUnderstanding: generation.result } : { error: generation.error }),
    }, null, 2)}\n`)
    if (!generation.ok) process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  process.stderr.write(`Context Understanding C0.1 failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
