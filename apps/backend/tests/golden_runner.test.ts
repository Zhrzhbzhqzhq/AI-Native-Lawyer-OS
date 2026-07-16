import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { renderReportMarkdown } from '../../../scripts/golden/reportGoldenCase'
import { requireProvider } from '../../../scripts/golden/runGoldenCase'
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
  writeJson(path.join(expectedDir, 'arguments.json'), { items: [{ golden_id: 'arg', position: '应偿还借款', minimum_reasoning_points: ['到期未还'], forbidden_claims: [] }] })
  writeJson(path.join(expectedDir, 'document.json'), { required_sections: ['民事起诉状'], required_placeholders: [], forbidden_terms: ['source_fact_ids'] })
  writeJson(path.join(expectedDir, 'relations.json'), {})

  const actual = {
    materials: [{ material_id: 'mat-1', matter_id: 'm-test', title: '合成材料' }],
    evidence: [{ evidence_id: 'ev-1', matter_id: 'm-test', material_id: 'mat-1', title: '借款证据', description: '借款证据内容', status: 'active' }],
    facts: [{ fact_id: 'fact-1', matter_id: 'm-test', title: '借款事实', description: '借款已经交付', status: 'active' }],
    issues: [{ issue_id: 'issue-1', matter_id: 'm-test', title: '借贷关系', description: '借贷关系是否成立', status: 'active' }],
    laws: [{ law_id: 'law-1', matter_id: 'm-test', issue_id: 'issue-1', title: '借款规则', citation: '民法典第六百六十七条', description: '借款合同规则', status: 'active' }],
    arguments: [{ argument_id: 'arg-1', matter_id: 'm-test', issue_id: 'issue-1', title: '应偿还借款', description: '到期未还，应依法偿还', conclusion: '应偿还借款', status: 'active' }],
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
