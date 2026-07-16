"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiUrl } from '../../../../lib/api'

const tokens = {
  pageBg: '#ffffff',
  cardBg: '#fafafa',
  panelBg: '#ffffff',
  border: '#e6e6e6',
  text: '#0f172a',
  muted: '#6b7280',
  accent: '#111827',
  radius: 8,
}

type Fact = { fact_id: string; title: string; description?: string }
type Issue = { issue_id: string; title: string; description?: string }
type Law = { law_id: string; title: string; citation?: string; description?: string }
type Argument = { argument_id: string; title: string; description?: string; conclusion?: string }
type ArgumentDraft = {
  id: string
  matter_id: string
  title: string
  position?: string
  reasoning?: string
  counter_argument?: string
  response?: string
  risk?: string
  conclusion?: string
  confidence?: number | null
  ai_reasoning?: string
  source_fact_ids?: string[]
  source_issue_ids?: string[]
  source_law_ids?: string[]
  review_status: 'pending' | 'accepted' | 'edited' | 'ignored'
  published_argument_id?: string | null
  published_at?: string | null
}

const reviewStatuses = new Set(['pending', 'accepted', 'edited', 'ignored'])
function isArgumentDraft(value: any): value is ArgumentDraft {
  return Boolean(value && typeof value === 'object' && typeof value.id === 'string' && typeof value.matter_id === 'string' && typeof value.title === 'string' && reviewStatuses.has(value.review_status) && (value.reasoning === undefined || value.reasoning === null || typeof value.reasoning === 'string') && (value.conclusion === undefined || value.conclusion === null || typeof value.conclusion === 'string') && (value.published_argument_id === undefined || value.published_argument_id === null || typeof value.published_argument_id === 'string'))
}

function confidenceText(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

function normalizeIds(value: unknown): string[] {
  return Array.isArray(value) ? value.map((id) => String(id || '')).filter(Boolean) : []
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ color: tokens.muted, fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{title}</div>
      <div style={{ color: tokens.text, lineHeight: 1.65 }}>{children || '—'}</div>
    </div>
  )
}

export default function ArgumentsWorkspace() {
  const params = useParams() as { matter_id?: string }
  const matterId = params?.matter_id || ''
  const router = useRouter()

  const [facts, setFacts] = useState<Fact[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [laws, setLaws] = useState<Law[]>([])
  const [argumentsList, setArgumentsList] = useState<Argument[]>([])
  const [drafts, setDrafts] = useState<ArgumentDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<Partial<ArgumentDraft>>({})
  const generatedOnce = useRef(false)

  const factMap = useMemo(() => new Map(facts.map((fact) => [fact.fact_id, fact])), [facts])
  const issueMap = useMemo(() => new Map(issues.map((issue) => [issue.issue_id, issue])), [issues])
  const lawMap = useMemo(() => new Map(laws.map((law) => [law.law_id, law])), [laws])
  const pendingCount = drafts.filter((draft) => draft.review_status !== 'accepted' && draft.review_status !== 'ignored').length
  const reviewed = drafts.length > 0 && pendingCount === 0
  const canContinue = argumentsList.length > 0

  async function loadAll() {
    if (!matterId) return
    setLoading(true)
    setErrorMsg(null)
    setLoadError(null)
    try {
      const [factsRes, issuesRes, lawsRes, argsRes, draftsRes] = await Promise.all([
        fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/facts`)),
        fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/issues`)),
        fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/laws`)),
        fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/arguments`)),
        fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/argument-drafts`)),
      ])
      if (!factsRes.ok || !issuesRes.ok || !lawsRes.ok || !argsRes.ok || !draftsRes.ok) throw new Error('法律论证工作区加载失败，请稍后重试')
      const [factsJson, issuesJson, lawsJson, argsJson, draftsJson] = await Promise.all([factsRes.json(), issuesRes.json(), lawsRes.json(), argsRes.json(), draftsRes.json()]).catch(() => { throw new Error('法律论证工作区返回数据暂不可用') })
      if (!Array.isArray(factsJson) || !Array.isArray(issuesJson) || !Array.isArray(lawsJson) || !Array.isArray(argsJson) || !draftsJson || typeof draftsJson !== 'object' || !Array.isArray(draftsJson.argument_drafts) || !draftsJson.argument_drafts.every(isArgumentDraft)) throw new Error('法律论证工作区返回数据暂不可用')
      setFacts(factsJson)
      setIssues(issuesJson)
      setLaws(lawsJson)
      setArgumentsList(argsJson)
      setDrafts(draftsJson.argument_drafts.map((draft: any) => ({
        ...draft,
        source_fact_ids: normalizeIds(draft.source_fact_ids),
        source_issue_ids: normalizeIds(draft.source_issue_ids),
        source_law_ids: normalizeIds(draft.source_law_ids),
      })))
    } catch (error: any) {
      setLoadError(String(error?.message || error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [matterId])

  useEffect(() => {
    if (!matterId || loading || generatedOnce.current) return
    if (argumentsList.length === 0 && drafts.length === 0 && laws.length > 0) {
      generatedOnce.current = true
      generateDrafts()
    }
  }, [matterId, loading, argumentsList.length, drafts.length, laws.length])

  async function generateDrafts() {
    setGenerating(true)
    setErrorMsg(null)
    try {
      const res = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/argument-drafts/generate`), {
        method: 'POST',
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`生成法律论证草稿失败 ${res.status} ${text}`)
      }
      const json = await res.json().catch(() => { throw new Error('法律论证草稿返回数据暂不可用') })
      if (!json || typeof json !== 'object' || !Array.isArray(json.argument_drafts) || !json.argument_drafts.every((draft: any) => isArgumentDraft(draft) && draft.id.trim().length > 0 && draft.matter_id === matterId)) throw new Error('法律论证草稿返回数据暂不可用')
      setDrafts(json.argument_drafts.map((draft: ArgumentDraft) => ({
        ...draft,
        source_fact_ids: normalizeIds(draft.source_fact_ids),
        source_issue_ids: normalizeIds(draft.source_issue_ids),
        source_law_ids: normalizeIds(draft.source_law_ids),
      })))
    } catch (error: any) {
      setErrorMsg(String(error?.message || error))
    } finally {
      setGenerating(false)
    }
  }

  async function updateDraft(draftId: string, payload: Record<string, unknown>) {
    setErrorMsg(null)
    const res = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/argument-drafts/${encodeURIComponent(draftId)}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`更新法律论证草稿失败 ${res.status} ${text}`)
    }
    const updated = await res.json().catch(() => { throw new Error('更新返回数据暂不可用') })
    if (!isArgumentDraft(updated) || updated.matter_id !== matterId || updated.id !== draftId) throw new Error('更新返回数据暂不可用')
    setDrafts((prev) => prev.map((draft) => draft.id === draftId ? {
      ...updated,
      source_fact_ids: normalizeIds(updated.source_fact_ids),
      source_issue_ids: normalizeIds(updated.source_issue_ids),
      source_law_ids: normalizeIds(updated.source_law_ids),
    } : draft))
  }

  async function publishDrafts() {
    setPublishing(true)
    setErrorMsg(null)
    try {
      const res = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/argument-drafts/publish`), {
        method: 'POST',
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`发布法律论证失败 ${res.status} ${text}`)
      }
      await loadAll()
    } catch (error: any) {
      setErrorMsg(String(error?.message || error))
    } finally {
      setPublishing(false)
    }
  }

  function startEdit(draft: ArgumentDraft) {
    setEditingId(draft.id)
    setEditingDraft({
      title: draft.title,
      position: draft.position || '',
      reasoning: draft.reasoning || '',
      counter_argument: draft.counter_argument || '',
      response: draft.response || '',
      risk: draft.risk || '',
      conclusion: draft.conclusion || '',
    })
  }

  async function saveEdit(draftId: string) {
    await updateDraft(draftId, editingDraft as Record<string, unknown>)
    setEditingId(null)
    setEditingDraft({})
  }

  if (loadError) return <main style={{ padding: 28 }}><div style={{ color: '#b91c1c' }}>{loadError}<button onClick={loadAll} style={{ marginLeft: 12 }}>重新加载</button></div></main>

  return (
    <div style={{ padding: 16, background: tokens.pageBg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>法律论证</div>
            <div style={{ color: tokens.muted, marginTop: 4 }}>Arguments Workspace</div>
          </div>
          <button
            disabled={!canContinue}
            onClick={() => router.push(`/matters/${matterId}/documents`)}
            style={{ padding: '10px 14px', borderRadius: tokens.radius, border: 'none', background: canContinue ? tokens.accent : '#d1d5db', color: '#fff', fontWeight: 800, cursor: canContinue ? 'pointer' : 'not-allowed' }}
          >
            AI 继续工作
          </button>
        </div>

        {errorMsg ? <div style={{ marginBottom: 12, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fee2e2', padding: 10, borderRadius: tokens.radius }}>{errorMsg}</div> : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(460px, 1.4fr)', gap: 16 }}>
          <aside style={{ background: tokens.cardBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, padding: 14 }}>
            <div style={{ fontWeight: 900 }}>来源上下文</div>
            <Section title={`争议焦点（${issues.length}）`}>
              {loading ? '正在加载…' : issues.length === 0 ? '请先完成争议焦点流程。' : issues.map((issue) => (
                <div key={issue.issue_id} style={{ padding: 10, background: tokens.panelBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, marginBottom: 8 }}>
                  <div style={{ fontWeight: 800 }}>{issue.title}</div>
                  {issue.description ? <div style={{ color: tokens.muted, marginTop: 6 }}>{issue.description}</div> : null}
                </div>
              ))}
            </Section>
            <Section title={`关键事实（${facts.length}）`}>
              {facts.length === 0 ? '请先完成事实流程。' : facts.map((fact) => (
                <div key={fact.fact_id} style={{ padding: 10, background: tokens.panelBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, marginBottom: 8 }}>
                  <div style={{ fontWeight: 800 }}>{fact.title}</div>
                  {fact.description ? <div style={{ color: tokens.muted, marginTop: 6 }}>{fact.description}</div> : null}
                </div>
              ))}
            </Section>
            <Section title={`适用法律依据（${laws.length}）`}>
              {laws.length === 0 ? '请先完成法律依据流程。' : laws.map((law) => (
                <div key={law.law_id} style={{ padding: 10, background: tokens.panelBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, marginBottom: 8 }}>
                  <div style={{ fontWeight: 800 }}>{law.title}</div>
                  {law.citation ? <div style={{ color: tokens.muted, marginTop: 6 }}>{law.citation}</div> : null}
                </div>
              ))}
            </Section>
          </aside>

          <main style={{ background: tokens.cardBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 900 }}>{argumentsList.length > 0 ? '正式法律论证' : '法律论证草稿'}</div>
                <div style={{ color: tokens.muted, marginTop: 4 }}>
                  {loading ? '加载中…' : argumentsList.length > 0 ? `${argumentsList.length} 条正式论证` : drafts.length > 0 ? `${drafts.length} 条草稿，${pendingCount} 条待审核` : laws.length === 0 ? '等待法律依据发布' : '准备生成草稿'}
                </div>
              </div>
              {argumentsList.length === 0 && reviewed ? (
                <button
                  disabled={publishing}
                  onClick={publishDrafts}
                  style={{ padding: '9px 12px', borderRadius: tokens.radius, border: 'none', background: tokens.accent, color: '#fff', fontWeight: 800 }}
                >
                  {publishing ? '发布中…' : '发布法律论证'}
                </button>
              ) : null}
            </div>

            {loading || generating ? (
              <div style={{ color: tokens.muted, marginTop: 18 }}>{generating ? '正在生成法律论证草稿…' : '正在加载法律论证…'}</div>
            ) : argumentsList.length > 0 ? (
              <div style={{ marginTop: 14 }}>
                {argumentsList.map((argument) => (
                  <div key={argument.argument_id} style={{ background: tokens.panelBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, padding: 14, marginBottom: 12 }}>
                    <div style={{ fontWeight: 900 }}>{argument.title}</div>
                    <Section title="论证过程">{argument.description || '—'}</Section>
                    <Section title="结论">{argument.conclusion || '—'}</Section>
                  </div>
                ))}
              </div>
            ) : laws.length === 0 ? (
              <div style={{ color: tokens.muted, marginTop: 18 }}>请先完成法律依据流程。</div>
            ) : drafts.length === 0 ? (
              <div style={{ color: tokens.muted, marginTop: 18 }}>暂无法律论证草稿。</div>
            ) : (
              <div style={{ marginTop: 14 }}>
                {drafts.map((draft) => {
                  const factTitles = normalizeIds(draft.source_fact_ids).map((id) => factMap.get(id)?.title || '来源事实')
                  const issueTitles = normalizeIds(draft.source_issue_ids).map((id) => issueMap.get(id)?.title || '来源争议焦点')
                  const lawTitles = normalizeIds(draft.source_law_ids).map((id) => {
                    const law = lawMap.get(id)
                    return law ? `${law.title}${law.citation ? `（${law.citation}）` : ''}` : '来源法律依据'
                  })
                  const editing = editingId === draft.id && !draft.published_at
                  return (
                    <div key={draft.id} style={{ background: tokens.panelBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, padding: 14, marginBottom: 12 }}>
                      {editing ? (
                        <div>
                          {(['title', 'position', 'reasoning', 'counter_argument', 'response', 'risk', 'conclusion'] as const).map((field) => (
                            <div key={field} style={{ marginBottom: 10 }}>
                              <div style={{ color: tokens.muted, fontSize: 12, fontWeight: 800, marginBottom: 5 }}>
                                {field === 'title' ? '论证标题' : field === 'position' ? '核心观点' : field === 'reasoning' ? '论证过程' : field === 'counter_argument' ? '可能抗辩' : field === 'response' ? '抗辩回应' : field === 'risk' ? '风险与薄弱点' : '结论'}
                              </div>
                              {field === 'title' ? (
                                <input value={String((editingDraft as any)[field] || '')} onChange={(e) => setEditingDraft((prev) => ({ ...prev, [field]: e.target.value }))} style={{ width: '100%', padding: 8, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius }} />
                              ) : (
                                <textarea value={String((editingDraft as any)[field] || '')} onChange={(e) => setEditingDraft((prev) => ({ ...prev, [field]: e.target.value }))} style={{ width: '100%', minHeight: 72, padding: 8, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius }} />
                              )}
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => { setEditingId(null); setEditingDraft({}) }} style={{ padding: '7px 10px', borderRadius: tokens.radius, border: `1px solid ${tokens.border}`, background: '#fff' }}>取消</button>
                            <button onClick={() => saveEdit(draft.id)} style={{ padding: '7px 10px', borderRadius: tokens.radius, border: 'none', background: tokens.accent, color: '#fff', fontWeight: 800 }}>保存修改</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                            <div>
                              <div style={{ fontWeight: 900 }}>{draft.title}</div>
                              <div style={{ color: tokens.muted, marginTop: 4 }}>可信度 {confidenceText(draft.confidence)}</div>
                            </div>
                          </div>
                          <Section title="核心观点">{draft.position || '—'}</Section>
                          <Section title="论证过程">{draft.reasoning || '—'}</Section>
                          <Section title="可能抗辩">{draft.counter_argument || '—'}</Section>
                          <Section title="抗辩回应">{draft.response || '—'}</Section>
                          <Section title="风险与薄弱点">{draft.risk || '—'}</Section>
                          <Section title="结论">{draft.conclusion || '—'}</Section>
                          <Section title="来源事实">{factTitles.join('、') || '—'}</Section>
                          <Section title="来源争议焦点">{issueTitles.join('、') || '—'}</Section>
                          <Section title="来源法律依据">{lawTitles.join('、') || '—'}</Section>
                          <Section title="AI 判断">{draft.ai_reasoning || '—'}</Section>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                            <button disabled={Boolean(draft.published_at)} onClick={() => updateDraft(draft.id, { review_status: 'accepted' })} style={{ padding: '7px 10px', borderRadius: tokens.radius, border: 'none', background: tokens.accent, color: '#fff', fontWeight: 800 }}>接受</button>
                            <button disabled={Boolean(draft.published_at)} onClick={() => startEdit(draft)} style={{ padding: '7px 10px', borderRadius: tokens.radius, border: `1px solid ${tokens.border}`, background: '#fff', fontWeight: 800 }}>修改</button>
                            <button disabled={Boolean(draft.published_at)} onClick={() => updateDraft(draft.id, { review_status: 'ignored' })} style={{ padding: '7px 10px', borderRadius: tokens.radius, border: `1px solid ${tokens.border}`, background: '#fff', color: '#991b1b', fontWeight: 800 }}>忽略</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {!reviewed ? <div style={{ color: tokens.muted, marginTop: 10 }}>请先完成法律论证草稿审核。</div> : null}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
