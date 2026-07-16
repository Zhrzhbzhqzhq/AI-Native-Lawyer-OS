import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { renderReportMarkdown } from '../../../scripts/golden/reportGoldenCase'
import { collectStageAIAudits, requireProvider, summarizeStageAIAudits } from '../../../scripts/golden/runGoldenCase'
import { scoreGoldenCase } from '../../../scripts/golden/scoreGoldenCase'
import { writeJson } from '../../../scripts/golden/utils'

function makeRunFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lawdesk-golden-test-'))
  const caseDir = path.join(root, 'golden', 'case01-private-lending')
  const runDir = path.join(caseDir, 'runs', 'run-test')
  const expectedDir = path.join(caseDir, 'expected')
  const actualDir = path.join(runDir, 'actual')
  fs.mkdirSync(expectedDir, { recursive: true })
  fs.mkdirSync(actualDir, { recursive: true })
  writeJson(path.join(root, 'golden', 'scoring.json'), { max_score: 100, pass_score: 85, module_weights: { evidence: 15, facts: 15, issues: 20, laws: 20, arguments: 20, document: 10 } })
  writeJson(path.join(runDir, 'run.json'), {
    run_id: 'run-test', case_id: 'case01-private-lending', dataset_version: '1.0.0', git_commit: 'abc123',
    provider_requested: 'mock', provider_actual: 'mock', model_actual: 'mock-lawdesk-v1', prompt_version: 'v1', fallback_used: false,
    caller_declared_database: 'lawdesk_rc_test', matter_id: 'm-test', started_at: '2026-01-01T00:00:00.000Z', completed_at: '2026-01-01T00:00:01.000Z', duration_ms: 1000,
    workflow_counts: {}, endpoint_results: [], word_export: { status: 200, content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size_bytes: 10 }, score: null, pass: true, passed: true, hard_failures: [],
  })
  writeJson(path.join(expectedDir, 'evidence.json'), { items: [{ golden_id: 'ev', must_include: ['借款'], must_not_include: ['保证责任'] }] })
  writeJson(path.join(expectedDir, 'facts.json'), { items: [{ golden_id: 'fact', required_keywords: ['借款'], forbidden_keywords: ['AI判断'] }] })
  writeJson(path.join(expectedDir, 'issues.json'), { items: [{ golden_id: 'issue', required_concepts: ['借贷关系'], forbidden_concepts: [] }] })
  writeJson(path.join(expectedDir, 'laws.json'), { items: [{ golden_id: 'law', citation: '民法典第六百六十七条', required_rule: '借款合同', verification_status: 'manually_verified' }], forbidden_laws: [] })
  writeJson(path.join(expectedDir, 'arguments.json'), { items: [{ golden_id: 'arg', position: '民间借贷关系成立', minimum_reasoning_points: ['借条和聊天记录证明借贷合意并由律师审核'], forbidden_claims: [] }] })
  writeJson(path.join(expectedDir, 'document.json'), { required_sections: ['民事起诉状'], required_placeholders: [], forbidden_terms: ['source_fact_ids'] })
  writeJson(path.join(expectedDir, 'relations.json'), {})

  const actual = {
    materials: [{ material_id: 'mat-1', matter_id: 'm-test', title: '合成材料' }],
    evidence: [{ evidence_id: 'ev-1', matter_id: 'm-test', material_id: 'mat-1', title: '借款证据', description: '借款证据内容', status: 'active' }],
    facts: [{ fact_id: 'fact-1', matter_id: 'm-test', title: '借款事实', description: '借款已经交付', status: 'active' }],
    issues: [{ issue_id: 'issue-1', matter_id: 'm-test', title: '民间借贷关系是否成立', description: '应根据借贷合意判断债权债务关系是否形成', status: 'active' }],
    laws: [{ law_id: 'law-1', matter_id: 'm-test', issue_id: 'issue-1', title: '借款合同规则', citation: '民法典第六百六十七条', description: '借款合同及借贷关系是否成立，应结合借条等实际履行材料判断', status: 'active' }],
    arguments: [{ argument_id: 'arg-1', matter_id: 'm-test', issue_id: 'issue-1', title: '借贷关系成立论证', description: '借条和聊天记录能够证明借贷合意并支持民间借贷关系成立，仍需律师审核', conclusion: '现有证据支持借贷关系成立', status: 'active' }],
    document: [{ document_id: 'doc-1', matter_id: 'm-test', title: '民事起诉状', content: '民事起诉状 正式诉讼请求与事实理由', status: 'published' }],
    relations: {
      evidence_to_materials: { 'ev-1': ['mat-1'] }, facts_to_evidence: { 'fact-1': ['ev-1'] }, issues_to_facts: { 'issue-1': ['fact-1'] }, laws_to_issues: { 'law-1': ['issue-1'] },
      arguments_to_sources: { 'arg-1': { facts: ['fact-1'], issues: ['issue-1'], laws: ['law-1'] } },
      document_to_sources: { complaint: { facts: ['fact-1'], issues: ['issue-1'], laws: ['law-1'], arguments: ['arg-1'] } },
    },
    audit: { facts: [{ review_status: 'accepted' }], issues: [{ review_status: 'accepted' }], laws: [{ review_status: 'accepted' }], arguments: [{ review_status: 'accepted' }], documents: [{ review_status: 'ready_to_publish' }] },
  }
  for (const [name, value] of Object.entries(actual)) writeJson(path.join(actualDir, `${name}.json`), value)
  return { runDir, actualDir }
}

function mutateJson(file: string, mutate: (value: any) => void) {
  const value = JSON.parse(fs.readFileSync(file, 'utf8'))
  mutate(value)
  writeJson(file, value)
}

describe('Golden Dataset Runner scoring', () => {
  it('only accepts explicit ai_audit and ai_audits contracts', () => {
    expect(collectStageAIAudits({ provider: 'mock', model: 'guessed', prompt_version: 'guessed', fallback_used: false }, 'facts')).toEqual([])
    expect(collectStageAIAudits({ metadata: { ai_audit: { provider: 'mock', model: 'nested', prompt_version: 'nested', fallback_used: false } } }, 'facts')).toEqual([])
    expect(collectStageAIAudits({ ai_audit: { provider: 'mock', model: 'mock-lawdesk-v1', prompt_version: 'fact-draft-v1', fallback_used: false } }, 'facts')).toEqual([
      { stage: 'facts', provider: 'mock', model: 'mock-lawdesk-v1', prompt_version: 'fact-draft-v1', fallback_used: false },
    ])
  })

  it('aggregates fallback and records provider or model conflicts without overwriting them', () => {
    const summary = summarizeStageAIAudits([
      { stage: 'facts', provider: 'mock', model: 'mock-lawdesk-v1', prompt_version: 'fact-draft-v1', fallback_used: false },
      { stage: 'issues', provider: 'minimax', model: 'MiniMax-M3', prompt_version: 'issue-draft-v1', fallback_used: true },
    ])
    expect(summary.provider_actual).toBeNull()
    expect(summary.model_actual).toBeNull()
    expect(summary.fallback_used).toBe(true)
    expect(summary.audit_conflicts).toEqual([
      'provider_conflict:mock,minimax',
      'model_conflict:mock-lawdesk-v1,MiniMax-M3',
    ])
  })

  it('keeps missing explicit audit metadata as Golden hard failures', () => {
    const fixture = makeRunFixture()
    mutateJson(path.join(fixture.runDir, 'run.json'), (run) => {
      run.provider_actual = null
      run.model_actual = null
      run.prompt_version = null
      run.fallback_used = null
      run.ai_audits = []
    })
    const report = scoreGoldenCase(fixture.runDir)
    expect(report.hard_failures).toContain('provider_audit_metadata_missing')
    expect(report.hard_failures).toContain('prompt_version_missing')
  })

  it('rejects invalid provider arguments and missing MiniMax key', () => {
    expect(() => requireProvider('bad-provider')).toThrow(/provider must be mock or minimax/)
    const previous = process.env.MINIMAX_API_KEY
    delete process.env.MINIMAX_API_KEY
    expect(() => requireProvider('minimax')).toThrow(/MINIMAX_API_KEY required/)
    if (previous) process.env.MINIMAX_API_KEY = previous
  })

  it('passes a complete valid fixture above the threshold', () => {
    const fixture = makeRunFixture()
    const report = scoreGoldenCase(fixture.runDir)
    expect(report.overall_score).toBeGreaterThanOrEqual(85)
    expect(report.hard_failures).toEqual([])
    expect(report.passed).toBe(true)
  })

  it('accepts legally equivalent expressions without requiring expected full sentences', () => {
    const fixture = makeRunFixture()
    const report = scoreGoldenCase(fixture.runDir)
    for (const moduleName of ['issues', 'laws', 'arguments']) {
      const module = report.module_results.find((item) => item.module === moduleName)
      expect(module?.missing).toEqual([])
      expect(module?.passed).toBe(true)
    }
    const argumentText = JSON.parse(fs.readFileSync(path.join(fixture.actualDir, 'arguments.json'), 'utf8'))[0].description
    expect(argumentText).not.toContain('张建国')
    expect(argumentText).not.toContain('李海涛')
  })

  it('still rejects non-empty output that does not express the required legal concepts', () => {
    const fixture = makeRunFixture()
    mutateJson(path.join(fixture.actualDir, 'issues.json'), (rows) => { rows[0] = { ...rows[0], title: '一般争议', description: '需要进一步处理' } })
    mutateJson(path.join(fixture.actualDir, 'laws.json'), (rows) => { rows[0] = { ...rows[0], title: '一般规则', description: '一般规范内容' } })
    mutateJson(path.join(fixture.actualDir, 'arguments.json'), (rows) => { rows[0] = { ...rows[0], title: '一般意见', description: '需要进一步分析', conclusion: '暂作一般处理' } })
    const report = scoreGoldenCase(fixture.runDir)
    for (const moduleName of ['issues', 'laws', 'arguments']) {
      const module = report.module_results.find((item) => item.module === moduleName)
      expect(module?.missing.length).toBeGreaterThan(0)
      expect(module?.passed).toBe(false)
    }
    expect(report.passed).toBe(false)
  })


  const p0Cases: Array<[string, string, (dir: string) => void]> = [
    ['unconfirmed formal object', 'unconfirmed_formal_object', (dir) => mutateJson(path.join(dir, 'audit.json'), (v) => { v.facts[0].review_status = 'edited' })],
    ['cross Matter object', 'cross_matter_relation', (dir) => mutateJson(path.join(dir, 'facts.json'), (v) => { v[0].matter_id = 'other-matter' })],
    ['empty source IDs', 'empty_source_ids', (dir) => mutateJson(path.join(dir, 'relations.json'), (v) => { v.facts_to_evidence['fact-1'] = [] })],
    ['missing source object', 'missing_source_object', (dir) => mutateJson(path.join(dir, 'relations.json'), (v) => { v.facts_to_evidence['fact-1'] = ['missing-evidence'] })],
    ['unsafe law placeholder', 'unsafe_law_placeholder', (dir) => mutateJson(path.join(dir, 'laws.json'), (v) => { v[0].citation = '民法典第X条' })],
    ['AI metadata leak', 'internal_metadata_leak', (dir) => mutateJson(path.join(dir, 'arguments.json'), (v) => { v[0].description = 'Prompt: source_fact_ids' })],
    ['invalid Document status', 'invalid_document_status', (dir) => mutateJson(path.join(dir, 'document.json'), (v) => { v[0].status = 'draft' })],
    ['empty formal content', 'formal_content_empty', (dir) => mutateJson(path.join(dir, 'issues.json'), (v) => { v[0].description = '' })],
  ]

  for (const [name, failure, mutate] of p0Cases) {
    it(`hard-fails independently for ${name}`, () => {
      const fixture = makeRunFixture()
      mutate(fixture.actualDir)
      const report = scoreGoldenCase(fixture.runDir)
      expect(report.hard_failures).toContain(failure)
      expect(report.passed).toBe(false)
    })
  }

  it('does not allow high module scores to offset a P0 failure', () => {
    const fixture = makeRunFixture()
    mutateJson(path.join(fixture.actualDir, 'document.json'), (value) => { value[0].status = 'editing' })
    const report = scoreGoldenCase(fixture.runDir)
    expect(report.overall_score).toBeGreaterThanOrEqual(85)
    expect(report.hard_failures).toContain('invalid_document_status')
    expect(report.passed).toBe(false)
  })

  it('scores identical Mock fixtures deterministically', () => {
    const fixture = makeRunFixture()
    const first = scoreGoldenCase(fixture.runDir)
    const second = scoreGoldenCase(fixture.runDir)
    expect({ score: first.overall_score, passed: first.passed, hard: first.hard_failures, modules: first.module_results }).toEqual({ score: second.overall_score, passed: second.passed, hard: second.hard_failures, modules: second.module_results })
  })

  it('renders auditable metadata in the markdown report', () => {
    const fixture = makeRunFixture()
    const markdown = renderReportMarkdown(scoreGoldenCase(fixture.runDir))
    expect(markdown).toContain('Dataset Version: 1.0.0')
    expect(markdown).toContain('Caller-Declared Database: lawdesk_rc_test')
    expect(markdown).toContain('PASS')
  })
})
