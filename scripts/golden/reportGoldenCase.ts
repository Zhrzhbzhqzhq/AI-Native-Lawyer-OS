import fs from 'fs'
import path from 'path'
import { GoldenReport } from './types'
import { latestRunDir, readJson } from './utils'

export function renderReportMarkdown(report: GoldenReport) {
  const lines: string[] = []
  lines.push(`# Golden Report: ${report.case_id}`)
  lines.push('')
  lines.push(`- Run ID: ${report.run_id}`)
  lines.push(`- Dataset Version: ${report.dataset_version}`)
  lines.push(`- Git Commit: ${report.git_commit || '-'}`)
  lines.push(`- Provider Requested: ${report.provider_requested}`)
  lines.push(`- Provider Actual: ${report.provider_actual || '-'}`)
  lines.push(`- Model Actual: ${report.model_actual || '-'}`)
  lines.push(`- Prompt Version: ${report.prompt_version || '-'}`)
  lines.push(`- Fallback Used: ${report.fallback_used === null ? '-' : String(report.fallback_used)}`)
  lines.push(`- Caller-Declared Database: ${report.caller_declared_database}`)
  lines.push(`- Started At: ${report.started_at}`)
  lines.push(`- Completed At: ${report.completed_at || '-'}`)
  lines.push(`- Duration: ${report.duration_ms ?? '-'}ms`)
  lines.push(`- Matter ID: ${report.matter_id || '-'}`)
  lines.push(`- Overall: ${report.overall_score}/${report.max_score}`)
  lines.push(`- Result: ${report.passed ? 'PASS' : 'FAIL'}`)
  lines.push('')
  lines.push('## Workflow Counts')
  for (const [key, value] of Object.entries(report.workflow_counts || {})) lines.push(`- ${key}: ${value}`)
  lines.push('')
  lines.push('## Module Scores')
  for (const mod of report.module_results) {
    lines.push(`- ${mod.module}: ${mod.score}/${mod.max_score} ${mod.passed ? 'PASS' : 'FAIL'}`)
  }
  lines.push('')
  lines.push('## Hard Failures')
  lines.push(...(report.hard_failures.length ? report.hard_failures.map((item) => `- ${item}`) : ['- None']))
  lines.push('')
  lines.push('## Missing')
  lines.push(...(report.missing.length ? report.missing.map((item) => `- ${item}`) : ['- None']))
  lines.push('')
  lines.push('## Warnings')
  lines.push(...(report.warnings.length ? report.warnings.map((item) => `- ${item}`) : ['- None']))
  lines.push('')
  lines.push('## Relation Errors')
  lines.push(...(report.relation_errors.length ? report.relation_errors.map((item) => `- ${item}`) : ['- None']))
  lines.push('')
  lines.push('## Document Export')
  lines.push(`- Status: ${report.word_export?.status ?? '-'}`)
  lines.push(`- Content-Type: ${report.word_export?.content_type || '-'}`)
  lines.push(`- Size: ${report.word_export?.size_bytes ?? '-'}`)
  lines.push('')
  return `${lines.join('\n')}\n`
}

export function writeReportMarkdown(runDir: string) {
  const report = readJson<GoldenReport>(path.join(runDir, 'report.json'))
  const md = renderReportMarkdown(report)
  fs.writeFileSync(path.join(runDir, 'report.md'), md, 'utf8')
  return md
}

export function reportGoldenCase(caseDir: string, runId?: string) {
  const runDir = runId ? path.join(caseDir, 'runs', runId) : latestRunDir(caseDir)
  return { runId: path.basename(runDir), markdown: writeReportMarkdown(runDir) }
}
