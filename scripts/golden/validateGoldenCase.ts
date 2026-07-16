import path from 'path'
import { scoreGoldenCase } from './scoreGoldenCase'
import { writeReportMarkdown } from './reportGoldenCase'
import { latestRunDir, writeJson } from './utils'

export function validateGoldenCase(caseDir: string, runId?: string) {
  const runDir = runId ? path.join(caseDir, 'runs', runId) : latestRunDir(caseDir)
  const report = scoreGoldenCase(runDir)
  writeJson(path.join(runDir, 'report.json'), report)
  writeReportMarkdown(runDir)
  return { ...report, selected_run_id: path.basename(runDir) }
}
