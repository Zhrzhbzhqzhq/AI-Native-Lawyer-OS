import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnvironment } from 'dotenv'
import { createPrismaClient } from '@lawdesk/database'
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
  if (!matterId) throw new Error('usage: pnpm exec tsx scripts/context-engine-c0.1-test.ts <matterId>')

  const prisma = createPrismaClient()
  try {
    const reader = new SafeMaterialReader({ repositoryRoot })
    const snapshot = await new MinimalContextBuilder(prisma, reader).build(matterId)
    process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  process.stderr.write(`Context Engine C0.1 failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})

