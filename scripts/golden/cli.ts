#!/usr/bin/env tsx
import { runGoldenCase } from './runGoldenCase'
import { validateGoldenCase } from './validateGoldenCase'
import { reportGoldenCase } from './reportGoldenCase'
import { caseDirFor, parseCliArgs } from './utils'
import { GoldenProvider } from './types'

async function main() {
  const command = process.argv[2]
  const { positional, flags } = parseCliArgs(process.argv.slice(3))
  const caseId = positional[0]
  if (!command || !caseId) {
    throw new Error('usage: pnpm golden:<run|validate|report> case01-private-lending [--provider=mock|minimax] [--run-id=id] [--base-url=http://localhost:3001]')
  }

  const baseUrl = String(flags['base-url'] || 'http://localhost:3001')
  const runId = typeof flags['run-id'] === 'string' ? flags['run-id'] : undefined
  const caseDir = caseDirFor(caseId)

  if (command === 'run') {
    const provider = String(flags.provider || 'mock') as GoldenProvider
    const result = await runGoldenCase({
      caseId,
      provider,
      baseUrl,
    })
    console.log(JSON.stringify({
      run_dir: result.runDir,
      passed: result.report.passed,
      overall_score: result.report.overall_score,
      hard_failures: result.report.hard_failures,
    }, null, 2))
    return
  }

  if (command === 'validate') {
    const report = validateGoldenCase(caseDir, runId)
    console.log(JSON.stringify({
      selected_run_id: report.selected_run_id,
      passed: report.passed,
      overall_score: report.overall_score,
      hard_failures: report.hard_failures,
      report: `${caseDir}/runs/${report.run_id}/report.json`,
    }, null, 2))
    return
  }

  if (command === 'report') {
    const result = reportGoldenCase(caseDir, runId)
    console.log(`Selected run_id: ${result.runId}`)
    console.log(result.markdown)
    return
  }

  throw new Error(`unknown golden command: ${command}`)
}

main().catch((err) => {
  console.error(err?.message || String(err))
  process.exit(1)
})
