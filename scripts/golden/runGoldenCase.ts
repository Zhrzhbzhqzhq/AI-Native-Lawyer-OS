import fs from 'fs'
import path from 'path'
import { GoldenApiClient, ApiError } from './apiClient'
import { validateGoldenCase } from './validateGoldenCase'
import { AIAudit, EndpointResult, GoldenProvider, GoldenRunJson, StageAIAudit } from './types'
import { assertFile, caseDirFor, compact, datasetConfig, ensureDir, gitCommit, listMaterialFiles, makeRunId, readJson, requireGoldenDatabaseName, writeJson } from './utils'

type RunOptions = {
  caseId: string
  provider: GoldenProvider
  baseUrl: string
}

export function requireProvider(provider: string): asserts provider is GoldenProvider {
  if (provider !== 'mock' && provider !== 'minimax') throw new Error('provider must be mock or minimax')
  if (provider === 'minimax' && !process.env.MINIMAX_API_KEY) throw new Error('MINIMAX_API_KEY required for minimax provider')
}

function expectedFiles(caseDir: string) {
  return ['matter', 'evidence', 'facts', 'issues', 'laws', 'arguments', 'document', 'relations']
    .map((name) => path.join(caseDir, 'expected', `${name}.json`))
}

function countRows(value: any) {
  if (Array.isArray(value)) return value.length
  if (Array.isArray(value?.items)) return value.items.length
  if (Array.isArray(value?.document_drafts)) return value.document_drafts.length
  if (Array.isArray(value?.law_drafts)) return value.law_drafts.length
  if (Array.isArray(value?.argument_drafts)) return value.argument_drafts.length
  if (value && typeof value === 'object') return 1
  return 0
}

function draftId(draft: any) {
  return String(draft?.draft_id || draft?.id || '')
}

function normalizeDraftList(value: any, key: string) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.[key])) return value[key]
  return []
}

function evidenceRelations(evidence: any[]) {
  const out: Record<string, string[]> = {}
  for (const ev of evidence) {
    const text = String(ev.description || '')
    const sourceLine = text.split(/\r?\n/).find((line) => line.startsWith('来源材料ID：')) || ''
    const ids = sourceLine.replace('来源材料ID：', '').split(',').map((id) => id.trim()).filter(Boolean)
    out[String(ev.evidence_id || ev.title || '')] = ids.length ? ids : [String(ev.material_id || '')].filter(Boolean)
  }
  return out
}

function publishedRelations(drafts: any[], publishedKey: string, sourceKey: string) {
  const out: Record<string, string[]> = {}
  for (const draft of drafts) {
    const id = String(draft?.[publishedKey] || draft?.title || '')
    if (!id) continue
    out[id] = Array.isArray(draft?.[sourceKey]) ? draft[sourceKey].map(String) : []
  }
  return out
}

function argumentRelations(drafts: any[]) {
  const out: Record<string, any> = {}
  for (const draft of drafts) {
    const id = String(draft?.published_argument_id || draft?.title || '')
    if (!id) continue
    out[id] = {
      facts: Array.isArray(draft.source_fact_ids) ? draft.source_fact_ids : [],
      issues: Array.isArray(draft.source_issue_ids) ? draft.source_issue_ids : [],
      laws: Array.isArray(draft.source_law_ids) ? draft.source_law_ids : [],
    }
  }
  return out
}

function documentRelations(draft: any) {
  return {
    complaint: {
      facts: Array.isArray(draft?.source_fact_ids) ? draft.source_fact_ids : [],
      issues: Array.isArray(draft?.source_issue_ids) ? draft.source_issue_ids : [],
      laws: Array.isArray(draft?.source_law_ids) ? draft.source_law_ids : [],
      arguments: Array.isArray(draft?.source_argument_ids) ? draft.source_argument_ids : [],
    },
  }
}

function isAIAudit(value: unknown): value is AIAudit {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const audit = value as Record<string, unknown>
  return typeof audit.provider === 'string' && audit.provider.trim().length > 0
    && typeof audit.model === 'string' && audit.model.trim().length > 0
    && typeof audit.prompt_version === 'string' && audit.prompt_version.trim().length > 0
    && typeof audit.fallback_used === 'boolean'
}

export function collectStageAIAudits(value: unknown, responseStage: string): StageAIAudit[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  const response = value as Record<string, unknown>
  const audits: StageAIAudit[] = []

  if (isAIAudit(response.ai_audit)) audits.push({ stage: responseStage, ...response.ai_audit })
  if (Array.isArray(response.ai_audits)) {
    for (const candidate of response.ai_audits) {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue
      const stageAudit = candidate as Record<string, unknown>
      if (typeof stageAudit.stage !== 'string' || !stageAudit.stage.trim() || !isAIAudit(stageAudit)) continue
      audits.push({
        stage: stageAudit.stage.trim(),
        provider: stageAudit.provider,
        model: stageAudit.model,
        prompt_version: stageAudit.prompt_version,
        fallback_used: stageAudit.fallback_used,
      })
    }
  }
  return audits
}

export function summarizeStageAIAudits(aiAudits: StageAIAudit[]) {
  const providerAudits = aiAudits.filter((audit) => audit.provider !== 'runtime')
  const providers = Array.from(new Set(providerAudits.map((audit) => audit.provider)))
  const models = Array.from(new Set(providerAudits.map((audit) => audit.model)))
  const promptVersions = Array.from(new Set(aiAudits.map((audit) => audit.prompt_version)))
  const auditConflicts: string[] = []
  if (providers.length > 1) auditConflicts.push(`provider_conflict:${providers.join(',')}`)
  if (models.length > 1) auditConflicts.push(`model_conflict:${models.join(',')}`)

  return {
    provider_actual: providers.length === 1 ? providers[0] : null,
    model_actual: models.length === 1 ? models[0] : null,
    prompt_version: promptVersions.length > 0 ? promptVersions.join(',') : null,
    fallback_used: aiAudits.length > 0 ? aiAudits.some((audit) => audit.fallback_used) : null,
    audit_conflicts: auditConflicts,
  }
}

export async function runGoldenCase(options: RunOptions) {
  requireProvider(options.provider)
  const callerDeclaredDatabase = requireGoldenDatabaseName()
  const started = Date.now()
  const startedAt = new Date(started).toISOString()
  const runId = makeRunId()
  const caseDir = caseDirFor(options.caseId)
  const dataset = datasetConfig()
  const runDir = path.join(caseDir, 'runs', runId)
  const actualDir = path.join(runDir, 'actual')
  ensureDir(actualDir)

  assertFile(path.join(caseDir, 'case.json'), 'case.json')
  for (const file of expectedFiles(caseDir)) assertFile(file, 'expected file')
  const caseConfig = readJson<any>(path.join(caseDir, 'case.json'))
  const materials = listMaterialFiles(caseDir)
  if (materials.length !== Number(caseConfig.material_count || 0)) {
    throw new Error(`material count mismatch: expected ${caseConfig.material_count}, got ${materials.length}`)
  }

  const api = new GoldenApiClient(options.baseUrl)
  const endpointResults: EndpointResult[] = []
  const workflowCounts: Record<string, number> = {}
  const wordExport = { status: null as number | null, content_type: null as string | null, size_bytes: null as number | null }
  let matterId: string | null = null
  const aiAudits: StageAIAudit[] = []
  const acceptedAudit: Record<string, any[]> = { facts: [], issues: [], laws: [], arguments: [], documents: [] }

  const captureAuditMetadata = (value: unknown, stage: string) => {
    for (const audit of collectStageAIAudits(value, stage)) {
      const key = `${audit.stage}|${audit.provider}|${audit.model}|${audit.prompt_version}|${audit.fallback_used}`
      if (!aiAudits.some((existing) => `${existing.stage}|${existing.provider}|${existing.model}|${existing.prompt_version}|${existing.fallback_used}` === key)) {
        aiAudits.push(audit)
      }
    }
  }

  const record = (step: string, endpoint: string, status: number | 'ERROR', ok: boolean, summary?: string) => {
    endpointResults.push({ step, endpoint, status, ok, summary })
  }

  const call = async <T>(step: string, method: 'get' | 'post' | 'patch', endpoint: string, body?: unknown): Promise<T> => {
    try {
      const result = await (api as any)[method](endpoint, body)
      if (step !== 'preflight') captureAuditMetadata(result, step)
      record(step, endpoint, 200, true, compact(result, 240))
      return result as T
    } catch (err: any) {
      if (err instanceof ApiError) record(step, endpoint, err.status, false, compact(err.body, 300))
      else record(step, endpoint, 'ERROR', false, err?.message || String(err))
      throw err
    }
  }

  const savePartialRun = (pass: boolean, error?: { step: string; message: string }) => {
    const finishedAt = new Date().toISOString()
    const auditSummary = summarizeStageAIAudits(aiAudits)
    const runJson: GoldenRunJson = {
      run_id: runId,
      case_id: options.caseId,
      dataset_version: String(dataset.dataset_version || dataset.version || ''),
      git_commit: gitCommit(),
      provider_requested: options.provider,
      provider_actual: auditSummary.provider_actual,
      model_actual: auditSummary.model_actual,
      prompt_version: auditSummary.prompt_version,
      fallback_used: auditSummary.fallback_used,
      ai_audits: aiAudits,
      audit_conflicts: auditSummary.audit_conflicts,
      caller_declared_database: callerDeclaredDatabase,
      matter_id: matterId,
      started_at: startedAt,
      completed_at: finishedAt,
      duration_ms: Date.now() - started,
      workflow_counts: workflowCounts,
      endpoint_results: endpointResults,
      word_export: wordExport,
      score: null,
      pass,
      passed: pass,
      hard_failures: [],
      error,
    }
    writeJson(path.join(runDir, 'run.json'), runJson)
    return runJson
  }

  try {
    const health = await call<any>('preflight', 'get', '/ai/health')
    const backendProvider = String(health?.provider || '').toLowerCase()
    if (backendProvider && backendProvider !== options.provider) {
      throw new Error(`当前后端 Provider 与请求参数不一致，请按指定环境变量重启后端。requested=${options.provider}, backend=${backendProvider}`)
    }

    const intakeFiles = materials.map((file) => ({ name: file.name, type: 'text/markdown', content: file.content }))
    const intake = await call<any>('intake', 'post', '/intake', { source: 'client', files: intakeFiles })
    const draft = intake?.matter_draft || intake?.analysis?.matter_draft || {}
    matterId = `golden-${options.caseId}-${runId}`

    await call('matter-create', 'post', '/matters', {
      matter_id: matterId,
      title: String(draft.title || caseConfig.name),
      description: String(intake?.analysis?.summary || caseConfig.description || caseConfig.name),
      matter_type: String(draft.matter_type || caseConfig.case_type),
    })

    const confirmMaterials = await call<any>('materials', 'post', '/intake/confirm-material', {
      matter_id: matterId,
      source: 'client',
      files: materials.map((file) => ({ name: file.name, mime_type: 'text/markdown' })),
      analysis: intake,
      idempotency_key: `golden-${runId}-materials`,
    })
    const materialRows = Array.isArray(confirmMaterials?.created_materials) ? confirmMaterials.created_materials : []
    workflowCounts.materials = materialRows.length

    const evidenceDraft = await call<any>('evidence-draft', 'post', '/intake/evidence-draft', {
      matter_id: matterId,
      materials: materialRows.map((row: any, index: number) => ({
        material_id: row.material_id,
        title: row.title,
        material_type: row.material_type || 'text/markdown',
        source: row.source || 'client',
        content: materials[index]?.content || '',
      })),
    })
    const evidenceDrafts = Array.isArray(evidenceDraft?.evidence_drafts) ? evidenceDraft.evidence_drafts : (Array.isArray(evidenceDraft) ? evidenceDraft : [])
    workflowCounts.evidence_drafts = evidenceDrafts.length
    await call('evidence-publish', 'post', '/intake/confirm-evidence', {
      matter_id: matterId,
      evidence_drafts: evidenceDrafts,
      idempotency_key: `golden-${runId}-evidence`,
    })

    const evidence = await call<any[]>('actual-evidence', 'get', `/matters/${matterId}/evidence`)
    workflowCounts.evidence = countRows(evidence)

    const factGen = await call<any>('fact-draft-generate', 'post', `/matters/${matterId}/fact-drafts/generate`)
    const factDrafts = normalizeDraftList(factGen, 'fact_drafts')
    workflowCounts.fact_drafts = factDrafts.length
    for (const draftRow of factDrafts) acceptedAudit.facts.push(await call('fact-draft-accept', 'patch', `/matters/${matterId}/fact-drafts/${draftId(draftRow)}`, { review_status: 'accepted' }))
    await call('fact-publish', 'post', `/matters/${matterId}/fact-drafts/publish`)
    const factDraftRows = await call<any[]>('actual-fact-drafts', 'get', `/matters/${matterId}/fact-drafts`)
    const facts = await call<any[]>('actual-facts', 'get', `/matters/${matterId}/facts`)
    workflowCounts.facts = countRows(facts)

    const issueGen = await call<any>('issue-draft-generate', 'post', `/matters/${matterId}/issue-drafts/generate`)
    const issueDrafts = normalizeDraftList(issueGen, 'issue_drafts')
    workflowCounts.issue_drafts = issueDrafts.length
    for (const draftRow of issueDrafts) acceptedAudit.issues.push(await call('issue-draft-accept', 'patch', `/matters/${matterId}/issue-drafts/${draftId(draftRow)}`, { review_status: 'accepted' }))
    await call('issue-publish', 'post', `/matters/${matterId}/issue-drafts/publish`)
    const issueDraftRows = await call<any>('actual-issue-drafts', 'get', `/matters/${matterId}/issue-drafts`)
    const issues = await call<any[]>('actual-issues', 'get', `/matters/${matterId}/issues`)
    workflowCounts.issues = countRows(issues)

    const lawGen = await call<any>('law-draft-generate', 'post', `/matters/${matterId}/law-drafts/generate`)
    const lawDrafts = normalizeDraftList(lawGen, 'law_drafts')
    workflowCounts.law_drafts = lawDrafts.length
    for (const draftRow of lawDrafts) acceptedAudit.laws.push(await call('law-draft-accept', 'patch', `/matters/${matterId}/law-drafts/${draftId(draftRow)}`, { review_status: 'accepted' }))
    await call('law-publish', 'post', `/matters/${matterId}/law-drafts/publish`)
    const lawDraftRows = await call<any>('actual-law-drafts', 'get', `/matters/${matterId}/law-drafts`)
    const laws = await call<any[]>('actual-laws', 'get', `/matters/${matterId}/laws`)
    workflowCounts.laws = countRows(laws)

    const argumentGen = await call<any>('argument-draft-generate', 'post', `/matters/${matterId}/argument-drafts/generate`)
    const argumentDrafts = normalizeDraftList(argumentGen, 'argument_drafts')
    workflowCounts.argument_drafts = argumentDrafts.length
    for (const draftRow of argumentDrafts) acceptedAudit.arguments.push(await call('argument-draft-accept', 'patch', `/matters/${matterId}/argument-drafts/${draftId(draftRow)}`, { review_status: 'accepted' }))
    await call('argument-publish', 'post', `/matters/${matterId}/argument-drafts/publish`)
    const argumentDraftRows = await call<any>('actual-argument-drafts', 'get', `/matters/${matterId}/argument-drafts`)
    const args = await call<any[]>('actual-arguments', 'get', `/matters/${matterId}/arguments`)
    workflowCounts.arguments = countRows(args)

    const docGen = await call<any>('document-draft-generate', 'post', `/matters/${matterId}/document-drafts/generate`, { document_type: caseConfig.document_type || 'complaint' })
    const documentDraft = docGen?.document_draft || docGen
    workflowCounts.document_drafts = documentDraft ? 1 : 0
    acceptedAudit.documents.push(await call('document-draft-ready', 'patch', `/matters/${matterId}/document-drafts/${documentDraft.id}`, { review_status: 'ready_to_publish' }))
    const docPublish = await call<any>('document-publish', 'post', `/matters/${matterId}/document-drafts/${documentDraft.id}/publish`)
    const documents = await call<any[]>('actual-documents', 'get', `/matters/${matterId}/documents`)
    workflowCounts.documents = countRows(documents)
    const documentId = docPublish?.document?.document_id || docPublish?.created_document?.document_id || documents?.[0]?.document_id
    if (documentId) {
      const exportResult = await api.binary(`/matters/${matterId}/documents/${documentId}/export.docx`)
      wordExport.status = exportResult.status
      wordExport.content_type = exportResult.contentType
      wordExport.size_bytes = exportResult.sizeBytes
      record('word-export', `/matters/${matterId}/documents/${documentId}/export.docx`, exportResult.status, true, `${exportResult.contentType} ${exportResult.sizeBytes} bytes`)
    }

    const matter = await call<any>('actual-matter', 'get', `/matters/${matterId}`)
    const relations = {
      evidence_to_materials: evidenceRelations(evidence),
      facts_to_evidence: publishedRelations(factDraftRows, 'published_fact_id', 'source_evidence_ids'),
      issues_to_facts: publishedRelations(normalizeDraftList(issueDraftRows, 'issue_drafts'), 'published_issue_id', 'source_fact_ids'),
      laws_to_issues: publishedRelations(normalizeDraftList(lawDraftRows, 'law_drafts'), 'published_law_id', 'source_issue_ids'),
      arguments_to_sources: argumentRelations(normalizeDraftList(argumentDraftRows, 'argument_drafts')),
      document_to_sources: documentRelations(documentDraft),
    }

    writeJson(path.join(actualDir, 'matter.json'), matter)
    writeJson(path.join(actualDir, 'materials.json'), materialRows)
    writeJson(path.join(actualDir, 'evidence.json'), evidence)
    writeJson(path.join(actualDir, 'facts.json'), facts)
    writeJson(path.join(actualDir, 'issues.json'), issues)
    writeJson(path.join(actualDir, 'laws.json'), laws)
    writeJson(path.join(actualDir, 'arguments.json'), args)
    writeJson(path.join(actualDir, 'document.json'), documents)
    writeJson(path.join(actualDir, 'relations.json'), relations)
    writeJson(path.join(actualDir, 'audit.json'), acceptedAudit)

    const runJson = savePartialRun(true)
    const report = validateGoldenCase(caseDir, runId)
    runJson.pass = report.passed
    runJson.passed = report.passed
    runJson.score = report.overall_score
    runJson.hard_failures = report.hard_failures
    writeJson(path.join(runDir, 'run.json'), runJson)
    return { runDir, runJson, report }
  } catch (err: any) {
    const message = err?.message || String(err)
    const failedRun = savePartialRun(false, { step: endpointResults[endpointResults.length - 1]?.step || 'unknown', message })
    for (const name of ['matter', 'materials', 'evidence', 'facts', 'issues', 'laws', 'arguments', 'document', 'relations', 'audit']) {
      const file = path.join(actualDir, `${name}.json`)
      if (!fs.existsSync(file)) writeJson(file, name === 'relations' ? {} : [])
    }
    try {
      const report = validateGoldenCase(caseDir, runId)
      failedRun.score = report.overall_score
      failedRun.hard_failures = report.hard_failures
      failedRun.pass = false
      failedRun.passed = false
      writeJson(path.join(runDir, 'run.json'), failedRun)
    } catch {
      // Keep original workflow error as the actionable failure.
    }
    throw new Error(message)
  }
}
