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
  subtle: '#f8fafc',
  accent: '#111827',
  radius: 8,
}

type Issue = {
  issue_id: string
  title: string
  description?: string
}

type LawDraft = {
  id: string
  matter_id: string
  title: string
  citation?: string
  rule_content?: string
  application?: string
  limitations?: string
  jurisdiction?: string
  source_reference?: string
  confidence?: number | null
  ai_reasoning?: string
  source_issue_ids?: string[]
  review_status: 'pending' | 'accepted' | 'edited' | 'ignored'
  published_law_id?: string | null
  published_at?: string | null
}

const reviewStatuses = new Set(['pending', 'accepted', 'edited', 'ignored'])
function isLawDraft(value: any): value is LawDraft {
  return Boolean(value && typeof value === 'object' && typeof value.id === 'string' && typeof value.matter_id === 'string' && typeof value.title === 'string' && reviewStatuses.has(value.review_status) && (value.citation === undefined || value.citation === null || typeof value.citation === 'string') && (value.rule_content === undefined || value.rule_content === null || typeof value.rule_content === 'string') && (value.published_law_id === undefined || value.published_law_id === null || typeof value.published_law_id === 'string'))
}

type Law = {
  law_id: string
  title: string
  citation?: string
  description?: string
  issue_id?: string
}

function confidenceText(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

function parseLawDescription(description?: string) {
  const lines = String(description || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const read = (label: string) => {
    const found = lines.find((line) => line.startsWith(label))
    return found ? found.slice(label.length).trim() : ''
  }
  return {
    rule_content: read('规则内容：') || description || '',
    application: read('本案适用说明：'),
    limitations: read('限制与风险：'),
    ai_reasoning: read('AI判断：'),
  }
}

function issueTitle(issueMap: Map<string, Issue>, id: string) {
  return issueMap.get(id)?.title || '来源争议焦点'
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ color: tokens.muted, fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{title}</div>
      <div style={{ color: tokens.text, lineHeight: 1.65 }}>{children || '—'}</div>
    </div>
  )
}

export default function LawsWorkspace() {
  const params = useParams() as { matter_id?: string }
  const matterId = params?.matter_id || ''
  const router = useRouter()

  const [issues, setIssues] = useState<Issue[]>([])
  const [laws, setLaws] = useState<Law[]>([])
  const [drafts, setDrafts] = useState<LawDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<Partial<LawDraft>>({})
  const generatedOnce = useRef(false)

  const issueMap = useMemo(() => new Map(issues.map((issue) => [issue.issue_id, issue])), [issues])
  const pendingCount = drafts.filter((draft) => draft.review_status !== 'accepted' && draft.review_status !== 'ignored').length
  const reviewed = drafts.length > 0 && pendingCount === 0
  const canContinue = laws.length > 0

  async function loadAll() {
    if (!matterId) return
    setLoading(true)
    setErrorMsg(null)
    setLoadError(null)
    try {
      const [issuesRes, lawsRes, draftsRes] = await Promise.all([
        fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/issues`)),
        fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/laws`)),
        fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/law-drafts`)),
      ])
      if (!issuesRes.ok || !lawsRes.ok || !draftsRes.ok) throw new Error('法律依据工作区加载失败，请稍后重试')
      const [issuesJson, lawsJson, draftsJson] = await Promise.all([issuesRes.json(), lawsRes.json(), draftsRes.json()]).catch(() => { throw new Error('法律依据工作区返回数据暂不可用') })
      if (!Array.isArray(issuesJson) || !Array.isArray(lawsJson) || !draftsJson || typeof draftsJson !== 'object' || !Array.isArray(draftsJson.law_drafts) || !draftsJson.law_drafts.every(isLawDraft)) throw new Error('法律依据工作区返回数据暂不可用')
      setIssues(issuesJson)
      setLaws(lawsJson)
      setDrafts(draftsJson.law_drafts)
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
    if (laws.length === 0 && drafts.length === 0 && issues.length > 0) {
      generatedOnce.current = true
      generateDrafts()
    }
  }, [matterId, loading, issues.length, laws.length, drafts.length])

  async function generateDrafts() {
    setGenerating(true)
    setErrorMsg(null)
    try {
      const res = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/law-drafts/generate`), {
        method: 'POST',
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`生成法律依据草稿失败 ${res.status} ${text}`)
      }
      const json = await res.json().catch(() => { throw new Error('法律依据草稿返回数据暂不可用') })
      if (!json || typeof json !== 'object' || !Array.isArray(json.law_drafts) || !json.law_drafts.every((draft: any) => isLawDraft(draft) && draft.id.trim().length > 0 && draft.matter_id === matterId)) throw new Error('法律依据草稿返回数据暂不可用')
      setDrafts(json.law_drafts)
    } catch (error: any) {
      setErrorMsg(String(error?.message || error))
    } finally {
      setGenerating(false)
    }
  }

  async function updateDraft(draftId: string, payload: Record<string, unknown>) {
    setErrorMsg(null)
    const res = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/law-drafts/${encodeURIComponent(draftId)}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`更新法律依据草稿失败 ${res.status} ${text}`)
    }
    const updated = await res.json().catch(() => { throw new Error('更新返回数据暂不可用') })
    if (!isLawDraft(updated) || updated.matter_id !== matterId || updated.id !== draftId) throw new Error('更新返回数据暂不可用')
    setDrafts((prev) => prev.map((draft) => draft.id === draftId ? updated : draft))
  }

  async function publishDrafts() {
    setPublishing(true)
    setErrorMsg(null)
    try {
      const res = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/law-drafts/publish`), {
        method: 'POST',
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`发布法律依据失败 ${res.status} ${text}`)
      }
      await loadAll()
    } catch (error: any) {
      setErrorMsg(String(error?.message || error))
    } finally {
      setPublishing(false)
    }
  }

  function startEdit(draft: LawDraft) {
    setEditingId(draft.id)
    setEditingDraft({
      title: draft.title,
      citation: draft.citation || '',
      rule_content: draft.rule_content || '',
      application: draft.application || '',
      limitations: draft.limitations || '',
      jurisdiction: draft.jurisdiction || '',
      source_reference: draft.source_reference || '',
    })
  }

  async function saveEdit(draftId: string) {
    await updateDraft(draftId, editingDraft as Record<string, unknown>)
    setEditingId(null)
    setEditingDraft({})
  }

  if (loadError) return <main style={{ padding: 28 }}><div style={{ color: '#b91c1c' }}>{loadError}<button onClick={loadAll} style={{ marginLeft: 12 }}>重新加载</button></div></main>

  return (
    <div className="lawdesk-workspace" style={{ padding: 16, background: tokens.pageBg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="ld-workspace-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>法律依据</div>
            <div style={{ color: tokens.muted, marginTop: 4 }}>Laws Workspace</div>
          </div>
          <button
            disabled={!canContinue}
            onClick={() => router.push(`/matters/${matterId}/arguments`)}
            style={{ padding: '10px 14px', borderRadius: tokens.radius, border: 'none', background: canContinue ? tokens.accent : '#d1d5db', color: '#fff', fontWeight: 800, cursor: canContinue ? 'pointer' : 'not-allowed' }}
          >
            AI 继续工作
          </button>
        </div>

        {errorMsg ? <div style={{ marginBottom: 12, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fee2e2', padding: 10, borderRadius: tokens.radius }}>{errorMsg}</div> : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(420px, 1.4fr)', gap: 16 }}>
          <aside style={{ background: tokens.cardBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 900 }}>来源争议焦点</div>
              <div style={{ color: tokens.muted }}>{loading ? '加载中…' : `${issues.length} 条`}</div>
            </div>
            <div style={{ marginTop: 12 }}>
              {loading ? (
                <div style={{ color: tokens.muted }}>正在加载争议焦点…</div>
              ) : issues.length === 0 ? (
                <div style={{ color: tokens.muted }}>请先完成争议焦点流程。</div>
              ) : (
                issues.map((issue) => (
                  <div key={issue.issue_id} style={{ padding: 10, background: tokens.panelBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, marginBottom: 8 }}>
                    <div style={{ fontWeight: 800 }}>{issue.title}</div>
                    {issue.description ? <div style={{ color: tokens.muted, marginTop: 6, lineHeight: 1.55 }}>{issue.description}</div> : null}
                  </div>
                ))
              )}
            </div>
          </aside>

          <main style={{ background: tokens.cardBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 900 }}>{laws.length > 0 ? '正式法律依据' : '法律依据草稿'}</div>
                <div style={{ color: tokens.muted, marginTop: 4 }}>
                  {laws.length > 0 ? `${laws.length} 条正式法律依据` : drafts.length > 0 ? `${drafts.length} 条草稿，待审核 ${pendingCount} 条` : 'AI 将根据正式争议焦点生成草稿'}
                </div>
              </div>
              {laws.length === 0 && reviewed ? (
                <button
                  disabled={publishing}
                  onClick={publishDrafts}
                  style={{ padding: '8px 12px', borderRadius: tokens.radius, border: 'none', background: tokens.accent, color: '#fff', fontWeight: 800 }}
                >
                  {publishing ? '发布中…' : '发布法律依据'}
                </button>
              ) : null}
            </div>

            {loading || generating ? (
              <div style={{ color: tokens.muted, marginTop: 16 }}>{generating ? '正在生成法律依据草稿…' : '正在加载法律依据…'}</div>
            ) : laws.length > 0 ? (
              <div style={{ marginTop: 14 }}>
                {laws.map((law) => {
                  const parsed = parseLawDescription(law.description)
                  return (
                    <article key={law.law_id} style={{ background: tokens.panelBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, padding: 14, marginBottom: 12 }}>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>{law.title}</div>
                      <div style={{ color: tokens.muted, marginTop: 6 }}>{law.citation || '未填写法条或裁判规则'}</div>
                      <Section title="规则内容">{parsed.rule_content}</Section>
                      <Section title="本案适用说明">{parsed.application}</Section>
                      <Section title="限制与风险">{parsed.limitations}</Section>
                      <Section title="来源争议焦点">{law.issue_id ? issueTitle(issueMap, law.issue_id) : '—'}</Section>
                    </article>
                  )
                })}
              </div>
            ) : issues.length === 0 ? (
              <div style={{ color: tokens.muted, marginTop: 16 }}>请先完成争议焦点流程，再生成法律依据草稿。</div>
            ) : drafts.length === 0 ? (
              <div style={{ color: tokens.muted, marginTop: 16 }}>暂无法律依据草稿。</div>
            ) : (
              <div style={{ marginTop: 14 }}>
                {drafts.map((draft) => {
                  const sourceIssueIds = Array.isArray(draft.source_issue_ids) ? draft.source_issue_ids : []
                  const isEditing = editingId === draft.id && !draft.published_at
                  return (
                    <article key={draft.id} style={{ background: tokens.panelBg, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius, padding: 14, marginBottom: 12 }}>
                      {isEditing ? (
                        <div style={{ display: 'grid', gap: 10 }}>
                          {(['title', 'citation', 'rule_content', 'application', 'limitations', 'jurisdiction', 'source_reference'] as const).map((field) => (
                            <label key={field} style={{ display: 'grid', gap: 5 }}>
                              <span style={{ color: tokens.muted, fontSize: 12, fontWeight: 800 }}>
                                {{
                                  title: '法律名称',
                                  citation: '法条或裁判规则',
                                  rule_content: '规则内容',
                                  application: '本案适用说明',
                                  limitations: '限制与风险',
                                  jurisdiction: '法域',
                                  source_reference: '来源参考',
                                }[field]}
                              </span>
                              {field === 'rule_content' || field === 'application' || field === 'limitations' ? (
                                <textarea value={String(editingDraft[field] || '')} onChange={(event) => setEditingDraft((prev) => ({ ...prev, [field]: event.target.value }))} style={{ minHeight: 78, padding: 8, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius }} />
                              ) : (
                                <input value={String(editingDraft[field] || '')} onChange={(event) => setEditingDraft((prev) => ({ ...prev, [field]: event.target.value }))} style={{ padding: 8, border: `1px solid ${tokens.border}`, borderRadius: tokens.radius }} />
                              )}
                            </label>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => { setEditingId(null); setEditingDraft({}) }} style={{ padding: '7px 10px', borderRadius: tokens.radius, border: `1px solid ${tokens.border}`, background: '#fff' }}>取消</button>
                            <button onClick={() => saveEdit(draft.id)} style={{ padding: '7px 10px', borderRadius: tokens.radius, border: 'none', background: tokens.accent, color: '#fff', fontWeight: 800 }}>保存修改</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                            <div>
                              <div style={{ fontWeight: 900, fontSize: 16 }}>{draft.title}</div>
                              <div style={{ color: tokens.muted, marginTop: 6 }}>{draft.citation || '未填写法条或裁判规则'}</div>
                            </div>
                            <div style={{ color: tokens.muted, fontWeight: 800 }}>{confidenceText(draft.confidence)}</div>
                          </div>
                          <Section title="规则内容">{draft.rule_content}</Section>
                          <Section title="本案适用说明">{draft.application}</Section>
                          <Section title="限制与风险">{draft.limitations}</Section>
                          <Section title="来源争议焦点">
                            {sourceIssueIds.length > 0 ? sourceIssueIds.map((id) => issueTitle(issueMap, id)).join('、') : '—'}
                          </Section>
                          <Section title="AI 判断">{draft.ai_reasoning}</Section>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                            <button disabled={Boolean(draft.published_at)} onClick={() => updateDraft(draft.id, { review_status: 'accepted' }).catch((error) => setErrorMsg(String(error?.message || error)))} style={{ padding: '7px 10px', borderRadius: tokens.radius, border: 'none', background: '#111827', color: '#fff', fontWeight: 800 }}>接受</button>
                            <button disabled={Boolean(draft.published_at)} onClick={() => startEdit(draft)} style={{ padding: '7px 10px', borderRadius: tokens.radius, border: `1px solid ${tokens.border}`, background: '#fff', fontWeight: 800 }}>修改</button>
                            <button disabled={Boolean(draft.published_at)} onClick={() => updateDraft(draft.id, { review_status: 'ignored' }).catch((error) => setErrorMsg(String(error?.message || error)))} style={{ padding: '7px 10px', borderRadius: tokens.radius, border: `1px solid ${tokens.border}`, background: '#fff', color: '#991b1b', fontWeight: 800 }}>忽略</button>
                          </div>
                        </>
                      )}
                    </article>
                  )
                })}
                {!reviewed ? <div style={{ color: tokens.muted, marginTop: 10 }}>请先完成法律依据草稿审核。</div> : null}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
