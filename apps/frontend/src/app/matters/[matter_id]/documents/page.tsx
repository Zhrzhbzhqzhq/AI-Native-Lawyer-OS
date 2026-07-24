"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiUrl } from '../../../../lib/api'

const tokens = {
  pageBg: '#ffffff',
  cardBg: '#fafafa',
  border: '#e6e6e6',
  text: '#0f172a',
  muted: '#6b7280',
  radius: 8,
}

type CountKey = 'materials' | 'evidence' | 'facts' | 'issues' | 'laws' | 'arguments'

const DOCUMENT_TYPES = [
  { value: 'complaint', label: '民事起诉状' },
]

const documentDraftStatuses = new Set(['generated', 'editing', 'ready_to_publish', 'published'])
const exportableDocumentStatuses = new Set(['published', 'completed', 'final'])
function isDocumentDraft(value: any) {
  return Boolean(value && typeof value === 'object' && typeof value.id === 'string' && typeof value.matter_id === 'string' && typeof value.document_type === 'string' && typeof value.title === 'string' && typeof value.content === 'string' && documentDraftStatuses.has(value.review_status) && (value.published_document_id === undefined || value.published_document_id === null || typeof value.published_document_id === 'string'))
}

function isFormalDocument(value: any) {
  return Boolean(value && typeof value === 'object' && typeof value.document_id === 'string' && typeof value.matter_id === 'string' && typeof value.title === 'string' && typeof value.status === 'string')
}

function arrayFromResponse(json: any, key?: string) {
  if (Array.isArray(json)) return json
  if (key && Array.isArray(json?.[key])) return json[key]
  return []
}

function toPercent(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return '—'
  return `${Math.round(Math.max(0, Math.min(1, number)) * 100)}%`
}

function idsFrom(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []
}

function namesFor(ids: string[], rows: any[], idField: string) {
  if (ids.length === 0) return ['暂无正式来源']
  return ids.map((id) => rows.find((row) => String(row?.[idField]) === id)?.title || id)
}

export default function DocumentsWorkspace() {
  const params = useParams() as { matter_id?: string }
  const matterId = params?.matter_id || ''
  const router = useRouter()

  const [documents, setDocuments] = useState<any[]>([])
  const [drafts, setDrafts] = useState<any[]>([])
  const [argumentsList, setArgumentsList] = useState<any[]>([])
  const [facts, setFacts] = useState<any[]>([])
  const [issues, setIssues] = useState<any[]>([])
  const [laws, setLaws] = useState<any[]>([])
  const [moduleCounts, setModuleCounts] = useState<Record<CountKey, number>>({
    materials: 0,
    evidence: 0,
    facts: 0,
    issues: 0,
    laws: 0,
    arguments: 0,
  })
  const [documentType, setDocumentType] = useState('complaint')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [lawyerNote, setLawyerNote] = useState('')

  const activeDraft = useMemo(() => drafts.find((draft) => draft.id === selectedDraftId) || drafts.find((draft) => !draft.published_at) || null, [drafts, selectedDraftId])
  const exportableDocuments = useMemo(() => documents.filter((document) => exportableDocumentStatuses.has(String(document.status).toLowerCase())), [documents])
  const activeDocument = useMemo(() => exportableDocuments.find((doc) => doc.document_id === selectedDocId) || exportableDocuments[0] || null, [exportableDocuments, selectedDocId])
  const hasPublishedDocument = exportableDocuments.length > 0

  async function loadAll() {
    if (!matterId) return
    setLoading(true)
    setLoadError(null)
    try {
      const endpoints = {
        documents: apiUrl(`/matters/${encodeURIComponent(matterId)}/documents`),
        drafts: apiUrl(`/matters/${encodeURIComponent(matterId)}/document-drafts`),
        arguments: apiUrl(`/matters/${encodeURIComponent(matterId)}/arguments`),
        facts: apiUrl(`/matters/${encodeURIComponent(matterId)}/facts`),
        issues: apiUrl(`/matters/${encodeURIComponent(matterId)}/issues`),
        laws: apiUrl(`/matters/${encodeURIComponent(matterId)}/laws`),
        materials: apiUrl(`/matters/${encodeURIComponent(matterId)}/materials`),
        evidence: apiUrl(`/matters/${encodeURIComponent(matterId)}/evidence`),
      }
      const entries = Object.entries(endpoints)
      const responses = await Promise.all(entries.map(([, url]) => fetch(url)))
      if (responses.some((response) => !response.ok)) throw new Error('request_failed')
      const payloads = await Promise.all(responses.map((response) => response.json())).catch(() => { throw new Error('invalid_response') })
      if (payloads.some((payload, index) => index === 1 ? (!payload || typeof payload !== 'object' || !Array.isArray(payload.document_drafts) || !payload.document_drafts.every(isDocumentDraft)) : !Array.isArray(payload))) throw new Error('invalid_response')
      if (!payloads[0].every((document: any) => isFormalDocument(document) && document.document_id.trim().length > 0 && document.matter_id === matterId)) throw new Error('invalid_response')
      if (!payloads[1].document_drafts.every((draft: any) => draft.id.trim().length > 0 && draft.matter_id === matterId)) throw new Error('invalid_response')
      const data = Object.fromEntries(entries.map(([key], index) => [key, payloads[index]]))
      const nextDocuments = arrayFromResponse(data.documents)
      const nextDrafts = data.drafts.document_drafts
      const nextArguments = arrayFromResponse(data.arguments)
      const nextFacts = arrayFromResponse(data.facts)
      const nextIssues = arrayFromResponse(data.issues)
      const nextLaws = arrayFromResponse(data.laws)
      setDocuments(nextDocuments)
      setDrafts(nextDrafts)
      setArgumentsList(nextArguments)
      setFacts(nextFacts)
      setIssues(nextIssues)
      setLaws(nextLaws)
      setModuleCounts({
        materials: arrayFromResponse(data.materials).length,
        evidence: arrayFromResponse(data.evidence).length,
        facts: nextFacts.length,
        issues: nextIssues.length,
        laws: nextLaws.length,
        arguments: nextArguments.length,
      })
      if (nextDrafts.length > 0 && !selectedDraftId) setSelectedDraftId(nextDrafts[0].id)
      const firstExportable = nextDocuments.find((document: any) => exportableDocumentStatuses.has(String(document.status).toLowerCase()))
      if (firstExportable && !selectedDocId) setSelectedDocId(firstExportable.document_id)
    } catch (error: any) {
      setLoadError(error?.message === 'invalid_response' ? '文书工作区返回数据暂不可用' : '文书工作区加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [matterId])

  useEffect(() => {
    if (!activeDraft) return
    setDraftTitle(activeDraft.title || '')
    setDraftContent(activeDraft.content || '')
    setLawyerNote(activeDraft.lawyer_note || '')
  }, [activeDraft?.id])

  async function generateDraft() {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/document-drafts/generate`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_type: documentType }),
      })
      if (!res.ok) throw new Error(`status:${res.status}`)
      const json = await res.json().catch(() => { throw new Error('invalid_response') })
      const allowedGenerateStatuses = json?.idempotent ? new Set(['generated', 'editing', 'ready_to_publish']) : new Set(['generated'])
      if (!json || typeof json !== 'object' || json.status !== 'document_draft_ready' || typeof json.idempotent !== 'boolean' || !isDocumentDraft(json.document_draft) || json.document_draft.matter_id !== matterId || !json.document_draft.id.trim() || !allowedGenerateStatuses.has(json.document_draft.review_status)) throw new Error('invalid_response')
      setMessage(json.idempotent ? '已恢复现有文书草稿' : '已生成文书草稿')
      setSelectedDraftId(json.document_draft?.id || null)
      await loadAll()
    } catch (e: any) {
      setMessage(e?.message === 'invalid_response' ? '文书草稿返回数据暂不可用' : e?.message === 'formal_arguments_required' ? '请先完成法律论证流程' : '生成文书草稿失败')
    } finally {
      setBusy(false)
    }
  }

  async function saveDraft(nextStatus?: 'editing' | 'ready_to_publish') {
    if (!activeDraft) return
    setBusy(true)
    setMessage(null)
    try {
      const payload: any = nextStatus
        ? { review_status: nextStatus, lawyer_note: lawyerNote }
        : { title: draftTitle, content: draftContent, lawyer_note: lawyerNote }
      const res = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/document-drafts/${encodeURIComponent(activeDraft.id)}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`status:${res.status}`)
      const updated = await res.json().catch(() => { throw new Error('invalid_response') })
      const expectedStatus = nextStatus || 'editing'
      if (!isDocumentDraft(updated) || updated.id !== activeDraft.id || updated.matter_id !== matterId || updated.review_status !== expectedStatus) throw new Error('invalid_response')
      setMessage(nextStatus === 'ready_to_publish' ? '草稿已标记为可发布' : '草稿已保存')
      await loadAll()
    } catch (e: any) {
      setMessage(e?.message === 'invalid_response' ? '更新返回数据暂不可用' : '保存草稿失败')
    } finally {
      setBusy(false)
    }
  }

  async function regenerateDraft() {
    if (!activeDraft) return
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/document-drafts/${encodeURIComponent(activeDraft.id)}/regenerate`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lawyer_note: lawyerNote }),
      })
      if (!res.ok) throw new Error(`status:${res.status}`)
      const updated = await res.json().catch(() => { throw new Error('invalid_response') })
      const allowedRegenerateStatuses = new Set(['generated', 'editing'])
      if (!isDocumentDraft(updated) || updated.id !== activeDraft.id || updated.matter_id !== matterId || !allowedRegenerateStatuses.has(updated.review_status)) throw new Error('invalid_response')
      setDraftTitle(updated.title || '')
      setDraftContent(updated.content || '')
      setLawyerNote(updated.lawyer_note || '')
      setMessage('已根据律师意见重新生成')
      await loadAll()
    } catch (e: any) {
      setMessage(e?.message === 'invalid_response' ? '文书草稿返回数据暂不可用' : '重新生成失败')
    } finally {
      setBusy(false)
    }
  }

  async function publishDraft() {
    if (!activeDraft) return
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/document-drafts/${encodeURIComponent(activeDraft.id)}/publish`), {
        method: 'POST',
      })
      if (!res.ok) throw new Error(`status:${res.status}`)
      const json = await res.json().catch(() => { throw new Error('invalid_response') })
      if (!json || typeof json !== 'object' || json.status !== 'document_published' || json.matter_id !== matterId || !isFormalDocument(json.document) || json.document.matter_id !== matterId || !json.document.document_id.trim() || !exportableDocumentStatuses.has(String(json.document.status).toLowerCase())) throw new Error('invalid_response')
      setMessage('正式文书已发布')
      setSelectedDocId(json.document?.document_id || null)
      await loadAll()
    } catch (e: any) {
      setMessage(e?.message === 'invalid_response' ? '发布返回数据暂不可用' : e?.message === 'content_required' ? '正文为空，不能发布' : '发布正式文书失败')
    } finally {
      setBusy(false)
    }
  }

  const draftSourceNames = activeDraft ? {
    arguments: namesFor(idsFrom(activeDraft.source_argument_ids), argumentsList, 'argument_id'),
    facts: namesFor(idsFrom(activeDraft.source_fact_ids), facts, 'fact_id'),
    issues: namesFor(idsFrom(activeDraft.source_issue_ids), issues, 'issue_id'),
    laws: namesFor(idsFrom(activeDraft.source_law_ids), laws, 'law_id'),
  } : null

  return (
    <div className="lawdesk-workspace" style={{ padding: 16, background: tokens.pageBg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => router.push(`/matters/${encodeURIComponent(matterId)}`)} style={{ background: 'transparent', border: 'none', color: tokens.muted, fontSize: 14, padding: 0, cursor: 'pointer' }}>← 返回案件概览</button>
        </div>

        <div className="ld-workspace-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: tokens.text }}>文书工作区</div>
            <div style={{ color: tokens.muted, marginTop: 4 }}>Document Draft Workspace</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {DOCUMENT_TYPES.map((type) => (
              <button key={type.value} onClick={() => setDocumentType(type.value)} style={{ padding: '8px 12px', borderRadius: tokens.radius, border: `1px solid ${documentType === type.value ? '#111827' : tokens.border}`, background: documentType === type.value ? '#111827' : '#fff', color: documentType === type.value ? '#fff' : tokens.text, fontWeight: 700 }}>{type.label}</button>
            ))}
          </div>
        </div>

        {loadError ? <div style={{ marginBottom: 12, padding: 10, border: '1px solid #fee2e2', borderRadius: tokens.radius, background: '#fef2f2', color: '#b91c1c' }}>{loadError}<button onClick={loadAll} style={{ marginLeft: 12 }}>重新加载</button></div> : null}
        {message ? <div style={{ marginBottom: 12, padding: 10, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, background: '#fff', color: tokens.text }}>{message}</div> : null}
        {!loading && !loadError && documents.length > 0 && exportableDocuments.length === 0 ? <div style={{ marginBottom: 12, padding: 10, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, background: '#fff', color: tokens.muted }}>暂无可导出的正式文书</div> : null}

        <div className="ld-document-layout" style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 20 }}>
          <aside className="ld-source-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <section style={{ background: tokens.cardBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, padding: 12 }}>
              <div style={{ fontWeight: 800 }}>办案成果来源</div>
              <div style={{ color: tokens.muted, fontSize: 12, marginTop: 3 }}>Published Case Work</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                {Object.entries(moduleCounts).map(([key, value]) => (
                  <div key={key} style={{ background: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 12, color: tokens.muted }}>{key}</div>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>{value}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ background: tokens.cardBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, padding: 12 }}>
              <div style={{ fontWeight: 800 }}>正式论证</div>
              <div style={{ color: tokens.muted, fontSize: 12, marginTop: 3 }}>Arguments</div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {argumentsList.length === 0 ? <div style={{ color: tokens.muted }}>请先完成法律论证流程</div> : argumentsList.map((argument) => (
                  <div key={argument.argument_id || argument.id} style={{ background: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 8, padding: 10 }}>
                    <div style={{ fontWeight: 800 }}>{argument.title || '未命名论证'}</div>
                    {argument.conclusion ? <div style={{ color: tokens.muted, marginTop: 6, fontSize: 13 }}>{argument.conclusion}</div> : null}
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <main style={{ minWidth: 0 }}>
            {loading ? (
              <div style={{ background: tokens.cardBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, padding: 16, color: tokens.muted }}>正在加载文书工作区…</div>
            ) : loadError ? null : hasPublishedDocument ? (
              <section className="ld-document-shell" style={{ background: tokens.cardBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>正式文书</div>
                    <div style={{ color: tokens.muted, fontSize: 12, marginTop: 3 }}>Published Document</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {exportableDocuments.map((doc) => {
                      const docId = doc.document_id || doc.id
                      return (
                        <button key={docId} onClick={() => setSelectedDocId(docId)} style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${selectedDocId === docId ? '#111827' : tokens.border}`, background: selectedDocId === docId ? '#111827' : '#fff', color: selectedDocId === docId ? '#fff' : tokens.text, fontWeight: 700 }}>{doc.document_type === 'complaint' ? '民事起诉状' : doc.document_type || '文书'}</button>
                      )
                    })}
                  </div>
                </div>

                {activeDocument ? (
                  <div style={{ marginTop: 14 }}>
                    <label style={{ display: 'block', fontWeight: 800, marginBottom: 6 }}>标题</label>
                    <input value={activeDocument.title || ''} readOnly style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${tokens.border}`, background: '#f8fafc' }} />
                    <label style={{ display: 'block', fontWeight: 800, marginTop: 12, marginBottom: 6 }}>正文</label>
                    <textarea className="ld-document-editor" value={activeDocument.content || ''} readOnly style={{ width: '100%', minHeight: 560, padding: 18, borderRadius: 8, border: `1px solid ${tokens.border}`, background: '#f8fafc', lineHeight: 1.8, fontSize: 15, fontFamily: 'serif' }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                      <a href={apiUrl(`/matters/${encodeURIComponent(matterId)}/documents/${encodeURIComponent(activeDocument.document_id || activeDocument.id)}/export.docx`)} style={{ padding: '9px 14px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontWeight: 800, textDecoration: 'none' }}>导出 Word</a>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : activeDraft ? (
              <section className="ld-document-shell" style={{ background: tokens.cardBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>文书草稿</div>
                    <div style={{ color: tokens.muted, fontSize: 12, marginTop: 3 }}>Document Draft</div>
                  </div>
                  <div style={{ color: tokens.muted, fontSize: 13 }}>可信度 {toPercent(activeDraft.confidence)}</div>
                </div>

                {draftSourceNames ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                    <SourceBox title="来源论证" items={draftSourceNames.arguments} />
                    <SourceBox title="来源事实" items={draftSourceNames.facts} />
                    <SourceBox title="来源争议焦点" items={draftSourceNames.issues} />
                    <SourceBox title="来源法律依据" items={draftSourceNames.laws} />
                  </div>
                ) : null}

                <div style={{ marginTop: 12, padding: 12, background: '#fff', borderRadius: 8, border: `1px solid ${tokens.border}` }}>
                  <div style={{ fontWeight: 800 }}>AI 判断</div>
                  <div style={{ color: tokens.muted, marginTop: 6 }}>{activeDraft.ai_reasoning || 'AI 已根据正式办案成果生成草稿，待律师审核。'}</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', fontWeight: 800, marginBottom: 6 }}>标题</label>
                  <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${tokens.border}` }} />
                  <label style={{ display: 'block', fontWeight: 800, marginTop: 12, marginBottom: 6 }}>正文</label>
                  <textarea className="ld-document-editor" value={draftContent} onChange={(e) => setDraftContent(e.target.value)} style={{ width: '100%', minHeight: 560, padding: 18, borderRadius: 8, border: `1px solid ${tokens.border}`, background: '#fff', lineHeight: 1.8, fontSize: 15, fontFamily: 'serif' }} />
                  <label style={{ display: 'block', fontWeight: 800, marginTop: 12, marginBottom: 6 }}>律师意见</label>
                  <textarea value={lawyerNote} onChange={(e) => setLawyerNote(e.target.value)} placeholder="可填写需要 AI 重写或补强的意见" style={{ width: '100%', minHeight: 84, padding: 10, borderRadius: 8, border: `1px solid ${tokens.border}` }} />
                </div>

                <div className="ld-document-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button disabled={busy} onClick={() => saveDraft()} style={{ padding: '9px 14px', borderRadius: 8, border: `1px solid ${tokens.border}`, background: '#fff', fontWeight: 800 }}>保存草稿</button>
                  <button disabled={busy} onClick={regenerateDraft} style={{ padding: '9px 14px', borderRadius: 8, border: `1px solid ${tokens.border}`, background: '#fff', fontWeight: 800 }}>根据律师意见重新生成</button>
                  <button disabled={busy} onClick={() => saveDraft('ready_to_publish')} style={{ padding: '9px 14px', borderRadius: 8, border: `1px solid ${tokens.border}`, background: '#fff', fontWeight: 800 }}>标记可发布</button>
                  <button disabled={busy || activeDraft.review_status !== 'ready_to_publish'} onClick={publishDraft} style={{ padding: '9px 14px', borderRadius: 8, border: 'none', background: activeDraft.review_status === 'ready_to_publish' ? '#111827' : '#9ca3af', color: '#fff', fontWeight: 800, cursor: activeDraft.review_status === 'ready_to_publish' ? 'pointer' : 'not-allowed' }}>发布正式文书</button>
                </div>
              </section>
            ) : (
              <section style={{ background: tokens.cardBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, padding: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>当前尚未生成文书草稿</div>
                <div style={{ color: tokens.muted, marginTop: 6 }}>No Document Draft Yet</div>
                <div style={{ color: tokens.muted, marginTop: 14, lineHeight: 1.8 }}>
                  已具备 Materials {moduleCounts.materials} 条、Evidence {moduleCounts.evidence} 条、Facts {moduleCounts.facts} 条、Issues {moduleCounts.issues} 条、Laws {moduleCounts.laws} 条、Arguments {moduleCounts.arguments} 条。
                </div>
                <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button disabled={busy || argumentsList.length === 0} onClick={generateDraft} style={{ padding: '10px 14px', borderRadius: 8, border: 'none', background: argumentsList.length === 0 ? '#9ca3af' : '#111827', color: '#fff', fontWeight: 900, cursor: argumentsList.length === 0 ? 'not-allowed' : 'pointer' }}>{busy ? '正在生成…' : 'AI 生成文书草稿'}</button>
                  <button onClick={() => router.push(`/matters/${encodeURIComponent(matterId)}`)} style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${tokens.border}`, background: '#fff', color: tokens.text, fontWeight: 800 }}>返回案件概览</button>
                </div>
                {argumentsList.length === 0 ? <div style={{ color: tokens.muted, marginTop: 10 }}>请先完成法律论证发布，再生成文书草稿。</div> : null}
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function SourceBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="ld-source-box" style={{ background: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 8, padding: 10 }}>
      <div style={{ fontWeight: 800 }}>{title}</div>
      <div style={{ color: tokens.muted, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((item) => <span key={`${title}-${item}`}>{item}</span>)}
      </div>
    </div>
  )
}
