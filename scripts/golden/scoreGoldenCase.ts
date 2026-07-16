import path from 'path'
import { GoldenReport, GoldenRunJson, ModuleScore } from './types'
import { includesAny, readJson, textOf } from './utils'

function arr(value: any): any[] {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.items)) return value.items
  return []
}

function body(rows: any[]) {
  return rows.map((row) => textOf(row)).join('\n')
}

function hasAll(text: string, terms: string[]) {
  return terms.filter((term) => !String(text || '').toLowerCase().includes(String(term).toLowerCase()))
}

function scoreFromMissing(weight: number, missingCount: number, warningCount: number, hardFailureCount: number) {
  if (hardFailureCount > 0) return Math.max(0, Math.round(weight * 0.35))
  return Math.max(0, weight - missingCount * 3 - warningCount)
}

function makeModule(module: string, max_score: number, checks: string[], missing: string[], warnings: string[], hard_failures: string[]): ModuleScore {
  const score = scoreFromMissing(max_score, missing.length, warnings.length, hard_failures.length)
  return { module, max_score, score, passed: hard_failures.length === 0 && score >= Math.ceil(max_score * 0.7), checks, missing, warnings, hard_failures }
}

function checkForbidden(module: string, text: string, terms: string[]) {
  return includesAny(text, terms).map((term) => `${module}: forbidden term present: ${term}`)
}

function relationWarnings(actualRelations: any, section: string) {
  if (!actualRelations || typeof actualRelations !== 'object') return [`relations missing section ${section}`]
  const value = actualRelations[section]
  if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && Object.keys(value).length === 0)) {
    return [`relations empty section ${section}`]
  }
  return []
}

function objectId(row: any, module: string) {
  const keys: Record<string, string> = { materials: 'material_id', evidence: 'evidence_id', facts: 'fact_id', issues: 'issue_id', laws: 'law_id', arguments: 'argument_id', document: 'document_id' }
  return String(row?.[keys[module]] || '')
}

function formalText(row: any) {
  return [row?.title, row?.description, row?.citation, row?.rule, row?.content, row?.conclusion].filter((value) => typeof value === 'string').join('\n')
}

function addP0Failures(run: GoldenRunJson, actual: any) {
  const failures = new Set<string>()
  const matterId = String(run.matter_id || '')
  const modules = ['evidence', 'facts', 'issues', 'laws', 'arguments', 'document']
  const rows: Record<string, any[]> = Object.fromEntries(modules.map((module) => [module, arr(actual[module])]))
  rows.materials = arr(actual.materials)

  for (const module of modules) {
    if (rows[module].some((row) => String(row?.matter_id || '') !== matterId)) failures.add('cross_matter_relation')
  }

  const requiredContent: Record<string, string[][]> = {
    facts: [['title'], ['description']], issues: [['title'], ['description']], laws: [['title'], ['citation'], ['description']],
    arguments: [['title'], ['description'], ['conclusion']], document: [['title'], ['content']],
  }
  for (const [module, groups] of Object.entries(requiredContent)) {
    if (rows[module].some((row) => groups.some((keys) => keys.every((key) => !String(row?.[key] || '').trim())))) failures.add('formal_content_empty')
  }

  if (rows.document.some((row) => !['published', 'completed', 'final'].includes(String(row?.status || '')))) failures.add('invalid_document_status')
  if (rows.laws.some((row) => /第\s*[XYＸＹxy]\s*条|TODO|placeholder|待补充/i.test(formalText(row)))) failures.add('unsafe_law_placeholder')
  const metadataPattern = /\bPrompt\b|ai_reasoning|AI判断|source_[a-z_]*_ids|published_[a-z_]*_id|\b(?:debug|internal)_[a-z_]+\b|\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i
  for (const module of ['facts', 'issues', 'laws', 'arguments', 'document']) {
    if (rows[module].some((row) => metadataPattern.test(formalText(row)))) failures.add('internal_metadata_leak')
  }

  const relations = actual.relations || {}
  const specs = [
    ['facts', 'evidence', 'facts_to_evidence'], ['issues', 'facts', 'issues_to_facts'], ['laws', 'issues', 'laws_to_issues'],
  ] as const
  for (const [targetModule, sourceModule, section] of specs) {
    const mapping = relations[section] || {}
    const sourceIds = new Set(rows[sourceModule].map((row) => objectId(row, sourceModule)))
    for (const target of rows[targetModule]) {
      const ids = mapping[objectId(target, targetModule)]
      if (!Array.isArray(ids) || ids.length === 0) failures.add('empty_source_ids')
      else if (ids.some((id: any) => !sourceIds.has(String(id)))) failures.add('missing_source_object')
    }
  }

  const argumentMapping = relations.arguments_to_sources || {}
  const sourceSets: Record<string, Set<string>> = {
    facts: new Set(rows.facts.map((row) => objectId(row, 'facts'))), issues: new Set(rows.issues.map((row) => objectId(row, 'issues'))), laws: new Set(rows.laws.map((row) => objectId(row, 'laws'))),
  }
  for (const target of rows.arguments) {
    const sources = argumentMapping[objectId(target, 'arguments')]
    for (const kind of ['facts', 'issues', 'laws']) {
      const ids = sources?.[kind]
      if (!Array.isArray(ids) || ids.length === 0) failures.add('empty_source_ids')
      else if (ids.some((id: any) => !sourceSets[kind].has(String(id)))) failures.add('missing_source_object')
    }
  }

  const documentSources = relations.document_to_sources?.complaint
  if (rows.document.length > 0) {
    for (const kind of ['facts', 'issues', 'laws', 'arguments']) {
      const ids = documentSources?.[kind]
      const sourceModule = kind === 'arguments' ? 'arguments' : kind
      const allowed = new Set(rows[sourceModule].map((row) => objectId(row, sourceModule)))
      if (!Array.isArray(ids) || ids.length === 0) failures.add('empty_source_ids')
      else if (ids.some((id: any) => !allowed.has(String(id)))) failures.add('missing_source_object')
    }
  }

  const audit = actual.audit || {}
  const auditSpecs: Array<[string, string]> = [['facts', 'accepted'], ['issues', 'accepted'], ['laws', 'accepted'], ['arguments', 'accepted'], ['documents', 'ready_to_publish']]
  for (const [module, status] of auditSpecs) {
    const formalModule = module === 'documents' ? 'document' : module
    const entries = Array.isArray(audit[module]) ? audit[module] : []
    if (rows[formalModule].length > 0 && (entries.length < rows[formalModule].length || entries.some((entry: any) => entry?.review_status !== status))) failures.add('unconfirmed_formal_object')
  }
  if (run.provider_requested === 'mock' && failures.has('unconfirmed_formal_object')) failures.add('mock_formal_output')

  if (!run.provider_actual || !run.model_actual || typeof run.fallback_used !== 'boolean') failures.add('provider_audit_metadata_missing')
  if (!run.prompt_version) failures.add('prompt_version_missing')
  return [...failures]
}

export function scoreGoldenCase(runDir: string): GoldenReport {
  const caseDir = path.resolve(runDir, '..', '..')
  const expectedDir = path.join(caseDir, 'expected')
  const actualDir = path.join(runDir, 'actual')
  const scoring = readJson<any>(path.join(path.resolve(caseDir, '..'), 'scoring.json'))
  const run = readJson<GoldenRunJson>(path.join(runDir, 'run.json'))

  const expected = {
    evidence: readJson<any>(path.join(expectedDir, 'evidence.json')),
    facts: readJson<any>(path.join(expectedDir, 'facts.json')),
    issues: readJson<any>(path.join(expectedDir, 'issues.json')),
    laws: readJson<any>(path.join(expectedDir, 'laws.json')),
    arguments: readJson<any>(path.join(expectedDir, 'arguments.json')),
    document: readJson<any>(path.join(expectedDir, 'document.json')),
    relations: readJson<any>(path.join(expectedDir, 'relations.json')),
  }
  const actual = {
    materials: readJson<any>(path.join(actualDir, 'materials.json')),
    evidence: readJson<any>(path.join(actualDir, 'evidence.json')),
    facts: readJson<any>(path.join(actualDir, 'facts.json')),
    issues: readJson<any>(path.join(actualDir, 'issues.json')),
    laws: readJson<any>(path.join(actualDir, 'laws.json')),
    arguments: readJson<any>(path.join(actualDir, 'arguments.json')),
    document: readJson<any>(path.join(actualDir, 'document.json')),
    relations: readJson<any>(path.join(actualDir, 'relations.json')),
    audit: readJson<any>(path.join(actualDir, 'audit.json')),
  }

  const modules: ModuleScore[] = []
  const hallucination_flags: string[] = []
  const relation_errors: string[] = []

  const evidenceText = body(arr(actual.evidence))
  const evidenceMissing = arr(expected.evidence).flatMap((item) => hasAll(evidenceText, item.must_include || []).map((term) => `evidence ${item.golden_id} missing ${term}`))
  const evidenceHard = arr(expected.evidence).flatMap((item) => checkForbidden('evidence', evidenceText, item.must_not_include || []))
  const evidenceWarnings = arr(expected.evidence).length > 0 && arr(actual.evidence).length !== arr(expected.evidence).length
    ? [`evidence count expected ${arr(expected.evidence).length}, received ${arr(actual.evidence).length}`]
    : []
  modules.push(makeModule('evidence', scoring.module_weights.evidence, ['proof goals', 'must_include', 'must_not_include'], evidenceMissing, evidenceWarnings, evidenceHard))

  const factsText = body(arr(actual.facts))
  const factsMissing = arr(expected.facts).flatMap((item) => hasAll(factsText, item.required_keywords || []).map((term) => `fact ${item.golden_id} missing ${term}`))
  const factsHard = arr(expected.facts).flatMap((item) => checkForbidden('facts', factsText, item.forbidden_keywords || []))
  modules.push(makeModule('facts', scoring.module_weights.facts, ['required_keywords', 'forbidden_keywords'], factsMissing, [], factsHard))

  const issuesText = body(arr(actual.issues))
  const issuesMissing = arr(expected.issues).flatMap((item) => hasAll(issuesText, item.required_concepts || []).map((term) => `issue ${item.golden_id} missing ${term}`))
  const issuesHard = arr(expected.issues).flatMap((item) => checkForbidden('issues', issuesText, item.forbidden_concepts || []))
  const issueTitles = arr(actual.issues).map((i) => String(i.title || '').trim()).filter(Boolean)
  const issuesWarnings = new Set(issueTitles).size !== issueTitles.length ? ['issues contain duplicate titles'] : []
  modules.push(makeModule('issues', scoring.module_weights.issues, ['required_concepts', 'forbidden_concepts', 'deduplication'], issuesMissing, issuesWarnings, issuesHard))

  const lawsText = body(arr(actual.laws))
  const lawsMissing = arr(expected.laws).flatMap((item) => hasAll(lawsText, [item.citation, item.required_rule].filter(Boolean)).map((term) => `law ${item.golden_id} missing ${term}`))
  const lawsHard = checkForbidden('laws', lawsText, expected.laws.forbidden_laws || [])
  const lawsWarnings = arr(expected.laws).filter((item) => item.verification_status !== 'manually_verified').map((item) => `law ${item.golden_id} is ${item.verification_status}`)
  modules.push(makeModule('laws', scoring.module_weights.laws, ['citation', 'required_rule', 'verification_status'], lawsMissing, lawsWarnings, lawsHard))

  const argumentsText = body(arr(actual.arguments))
  const argumentsMissing = arr(expected.arguments).flatMap((item) => hasAll(argumentsText, [item.position, ...(item.minimum_reasoning_points || [])].filter(Boolean)).map((term) => `argument ${item.golden_id} missing ${term}`))
  const argumentsHard = arr(expected.arguments).flatMap((item) => checkForbidden('arguments', argumentsText, item.forbidden_claims || []))
  modules.push(makeModule('arguments', scoring.module_weights.arguments, ['position', 'minimum_reasoning_points', 'forbidden_claims'], argumentsMissing, [], argumentsHard))

  const documentText = body(arr(actual.document).length > 0 ? arr(actual.document) : [actual.document])
  const documentMissing = hasAll(documentText, [...(expected.document.required_sections || []), ...(expected.document.required_placeholders || [])]).map((term) => `document missing ${term}`)
  const documentHard = checkForbidden('document', documentText, expected.document.forbidden_terms || [])
  if (!run.word_export || run.word_export.status !== 200) documentHard.push('document: docx export failed')
  modules.push(makeModule('document', scoring.module_weights.document, ['required_sections', 'required_placeholders', 'forbidden_terms', 'docx_export'], documentMissing, [], documentHard))

  for (const section of ['evidence_to_materials', 'facts_to_evidence', 'issues_to_facts', 'laws_to_issues', 'arguments_to_sources', 'document_to_sources']) {
    relation_errors.push(...relationWarnings(actual.relations, section))
  }
  if (relation_errors.length > 0) hallucination_flags.push('traceability_incomplete')

  const hard_failures = [...new Set([...modules.flatMap((m) => m.hard_failures), ...addP0Failures(run, actual)])]
  const missing = modules.flatMap((m) => m.missing)
  const warnings = [...modules.flatMap((m) => m.warnings), ...relation_errors]
  const overall_score = modules.reduce((sum, m) => sum + m.score, 0)
  const passed = hard_failures.length === 0 && overall_score >= Number(scoring.pass_score || 85) && relation_errors.length === 0

  return {
    run_id: run.run_id,
    case_id: run.case_id,
    dataset_version: run.dataset_version,
    git_commit: run.git_commit,
    provider_requested: run.provider_requested,
    provider_actual: run.provider_actual,
    model_actual: run.model_actual,
    prompt_version: run.prompt_version,
    fallback_used: run.fallback_used,
    caller_declared_database: run.caller_declared_database,
    matter_id: run.matter_id,
    started_at: run.started_at,
    completed_at: run.completed_at,
    duration_ms: run.duration_ms,
    score: overall_score,
    overall_score,
    max_score: Number(scoring.max_score || 100),
    passed,
    hard_failures,
    warnings,
    missing,
    unexpected: [],
    hallucination_flags,
    relation_errors,
    module_results: modules,
    workflow_counts: run.workflow_counts,
    word_export: run.word_export,
    generated_at: new Date().toISOString(),
  }
}
