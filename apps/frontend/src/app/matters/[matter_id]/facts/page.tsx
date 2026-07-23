"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiUrl } from '../../../../lib/api'

const tokens = {
    pageBg: '#f7fafc',
    cardBg: '#ffffff',
    border: '#e6eef6',
    text: '#0f172a',
    muted: '#6b7280',
    blue: '#2563eb',
    radius: 10,
}

type Evidence = {
    evidence_id: string
    title?: string
    status?: string
    description?: string
    relevance?: string
}

type FactDraft = {
    draft_id: string
    matter_id: string
    title: string
    description?: string
    confidence?: number | null
    ai_reasoning?: string | null
    source_evidence_ids?: string[]
    review_status: 'pending' | 'accepted' | 'edited' | 'ignored'
    lawyer_note?: string | null
    published_fact_id?: string | null
    published_at?: string | null
}

const reviewStatuses = new Set(['pending', 'accepted', 'edited', 'ignored'])
function isFactDraft(value: any): value is FactDraft {
    return Boolean(value && typeof value === 'object' && typeof value.draft_id === 'string' && typeof value.matter_id === 'string' && typeof value.title === 'string' && reviewStatuses.has(value.review_status) && (value.description === undefined || value.description === null || typeof value.description === 'string') && (value.published_fact_id === undefined || value.published_fact_id === null || typeof value.published_fact_id === 'string'))
}

type Fact = {
    fact_id: string
    title: string
    description?: string
    status?: string
    created_at?: string
}

function sourceIdsOf(draft: FactDraft) {
    return Array.isArray(draft.source_evidence_ids) ? draft.source_evidence_ids.map(String) : []
}

function statusLabel(status: string) {
    if (status === 'accepted') return '已接受'
    if (status === 'edited') return '已修改'
    if (status === 'ignored') return '已忽略'
    return '待审核'
}

function formatConfidence(value: number | null | undefined) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
    const percent = value <= 1 ? value * 100 : value
    return `${Math.round(percent)}%`
}

function fieldLabel(label: string) {
    return <div style={{ fontSize: 12, fontWeight: 800, color: tokens.text, marginBottom: 4 }}>{label}</div>
}

function isTechnicalValue(value: string) {
    const text = value.trim()
    if (!text) return true
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) return true
    if (/^(ev|fd|fact|mat)-/i.test(text)) return true
    return /\.(md|txt|json|pdf|docx?|png|jpe?g|mp3|m4a)$/i.test(text)
}

function cleanDisplayText(value: unknown, fallback: string) {
    const text = String(value || '').trim()
    if (!text || isTechnicalValue(text)) return fallback
    return text
}

function evidenceDisplayTitle(evidence: Evidence, index: number) {
    const fallback = `来源证据 ${index + 1}`
    return cleanDisplayText(evidence.title, cleanDisplayText(evidence.relevance, fallback))
}

export default function FactsWorkspace() {
    const params = useParams() as { matter_id?: string }
    const matterId = params?.matter_id || ''
    const router = useRouter()

    const [evidences, setEvidences] = useState<Evidence[]>([])
    const [facts, setFacts] = useState<Fact[]>([])
    const [drafts, setDrafts] = useState<FactDraft[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
    const [editTitle, setEditTitle] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [didAutoGenerate, setDidAutoGenerate] = useState(false)

    const evidenceTitleById = useMemo(() => {
        const map = new Map<string, string>()
        evidences.forEach((e, index) => map.set(String(e.evidence_id), evidenceDisplayTitle(e, index)))
        return map
    }, [evidences])

    const allDraftsReviewed = drafts.length > 0 && drafts.every((draft) => draft.review_status === 'accepted' || draft.review_status === 'ignored')
    const canPublish = facts.length === 0 && allDraftsReviewed
    const canContinueAi = facts.length > 0

    async function loadAll() {
        if (!matterId) return
        setLoading(true)
        setMessage(null)
        setLoadError(null)
        try {
            const [evidenceRes, factsRes, draftsRes] = await Promise.all([
                fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/evidence`)),
                fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/facts`)),
                fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/fact-drafts`)),
            ])
            if (!evidenceRes.ok || !factsRes.ok || !draftsRes.ok) throw new Error('事实工作区加载失败，请稍后重试')
            const [evidenceJson, factsJson, draftsJson] = await Promise.all([evidenceRes.json(), factsRes.json(), draftsRes.json()]).catch(() => { throw new Error('事实工作区返回数据暂不可用') })
            if (!Array.isArray(evidenceJson) || !Array.isArray(factsJson) || !Array.isArray(draftsJson) || !draftsJson.every(isFactDraft)) throw new Error('事实工作区返回数据暂不可用')
            setEvidences(evidenceJson)
            setFacts(factsJson)
            setDrafts(draftsJson)
        } catch (error: any) {
            setLoadError(String(error?.message || error))
        } finally {
            setLoading(false)
        }
    }

    async function generateDrafts() {
        if (!matterId || generating) return
        setGenerating(true)
        setMessage(null)
        try {
            const res = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/fact-drafts/generate`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            })
            if (!res.ok) {
                const text = await res.text().catch(() => '')
                throw new Error(`生成事实草稿失败 ${res.status} ${text}`)
            }
            const json = await res.json().catch(() => { throw new Error('事实草稿返回数据暂不可用') })
            if (!json || typeof json !== 'object' || !Array.isArray(json.fact_drafts) || !json.fact_drafts.every((draft: any) => isFactDraft(draft) && draft.draft_id.trim().length > 0 && draft.matter_id === matterId)) throw new Error('事实草稿返回数据暂不可用')
            setDrafts(json.fact_drafts)
        } catch (error: any) {
            setMessage(String(error?.message || error))
        } finally {
            setGenerating(false)
        }
    }

    async function patchDraft(draftId: string, payload: Record<string, unknown>) {
        const res = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/fact-drafts/${encodeURIComponent(draftId)}`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        if (!res.ok) {
            const text = await res.text().catch(() => '')
            throw new Error(`更新事实草稿失败 ${res.status} ${text}`)
        }
        const updated = await res.json().catch(() => { throw new Error('更新返回数据暂不可用') })
        if (!isFactDraft(updated) || updated.matter_id !== matterId || updated.draft_id !== draftId) throw new Error('更新返回数据暂不可用')
        setDrafts((current) => current.map((draft) => draft.draft_id === draftId ? updated : draft))
    }

    async function acceptDraft(draftId: string) {
        setMessage(null)
        try {
            await patchDraft(draftId, { review_status: 'accepted' })
        } catch (error: any) {
            setMessage(String(error?.message || error))
        }
    }

    async function ignoreDraft(draftId: string) {
        setMessage(null)
        try {
            await patchDraft(draftId, { review_status: 'ignored' })
        } catch (error: any) {
            setMessage(String(error?.message || error))
        }
    }

    function startEdit(draft: FactDraft) {
        setEditingDraftId(draft.draft_id)
        setEditTitle(draft.title || '')
        setEditDescription(draft.description || '')
    }

    async function saveEdit(draftId: string) {
        const title = editTitle.trim()
        if (!title) {
            setMessage('事实内容不能为空')
            return
        }
        setMessage(null)
        try {
            await patchDraft(draftId, { title, description: editDescription })
            setEditingDraftId(null)
            setEditTitle('')
            setEditDescription('')
        } catch (error: any) {
            setMessage(String(error?.message || error))
        }
    }

    async function publishDrafts() {
        setPublishing(true)
        setMessage(null)
        try {
            const res = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/fact-drafts/publish`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            })
            if (!res.ok) {
                const text = await res.text().catch(() => '')
                throw new Error(`发布 Facts 失败 ${res.status} ${text}`)
            }
            await loadAll()
        } catch (error: any) {
            setMessage(String(error?.message || error))
        } finally {
            setPublishing(false)
        }
    }

    useEffect(() => {
        setDidAutoGenerate(false)
        loadAll()
    }, [matterId])

    useEffect(() => {
        if (loading || didAutoGenerate || generating) return
        if (facts.length === 0 && drafts.length === 0 && evidences.length > 0) {
            setDidAutoGenerate(true)
            generateDrafts()
        }
    }, [loading, didAutoGenerate, generating, facts.length, drafts.length, evidences.length])

    if (loadError) return <main style={{ padding: 28 }}><div style={{ color: '#b91c1c' }}>{loadError}<button onClick={loadAll} style={{ marginLeft: 12 }}>重新加载</button></div></main>

    return (
        <div className="lawdesk-workspace" style={{ padding: 16, background: tokens.pageBg, minHeight: '100vh' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ marginBottom: 12 }}>
                    <button onClick={() => router.push(`/matters/${matterId}`)} style={{ background: 'transparent', border: 'none', color: tokens.muted, fontSize: 14, padding: 0, cursor: 'pointer' }}>← 返回案件概览</button>
                </div>

                <header style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <div>
                        <h2 style={{ margin: 0 }}>事实工作区</h2>
                        <div style={{ color: tokens.muted, marginTop: 6 }}>AI 基于已确认的证据生成事实草稿，律师审核后发布正式事实。</div>
                    </div>
                    <button disabled={!canContinueAi} onClick={() => router.push(`/matters/${matterId}/issues`)} style={{ padding: '8px 12px', borderRadius: 8, background: canContinueAi ? '#111827' : '#94a3b8', color: '#fff', border: 'none', fontWeight: 700, cursor: canContinueAi ? 'pointer' : 'default' }}>AI 继续工作</button>
                </header>

                {message ? <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: '#fff7ed', color: '#92400e', border: '1px solid #fed7aa' }}>{message}</div> : null}

                <div className="ld-review-layout" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
                    <section className="ld-source-panel" style={{ background: tokens.cardBg, padding: 12, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800 }}>来源证据</div>
                            <div style={{ color: tokens.muted }}>{loading ? '加载中…' : `${evidences.length} 条`}</div>
                        </div>
                        <div style={{ marginTop: 12 }}>
                            {loading ? (
                                <div style={{ color: tokens.muted }}>加载证据中…</div>
                            ) : evidences.length === 0 ? (
                                <div style={{ color: tokens.muted }}>请先完成证据草稿审核并发布正式证据。</div>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {evidences.map((e, index) => (
                                        <li className="ld-list-item" key={e.evidence_id} style={{ padding: 10, borderBottom: index < evidences.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                            <div style={{ fontWeight: 700 }}>{evidenceDisplayTitle(e, index)}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </section>

                    <section style={{ background: tokens.cardBg, padding: 12, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 800 }}>事实</div>
                                <div style={{ color: tokens.muted, marginTop: 4 }}>{facts.length > 0 ? '正式事实已发布' : '事实草稿待律师审核'}</div>
                            </div>
                            {canPublish ? (
                                <button disabled={publishing} onClick={publishDrafts} style={{ padding: '8px 12px', borderRadius: 8, background: tokens.blue, color: '#fff', border: 'none', fontWeight: 800 }}>{publishing ? '发布中…' : '发布事实'}</button>
                            ) : null}
                        </div>

                        <div style={{ marginTop: 12 }}>
                            {loading || generating ? (
                                <div style={{ color: tokens.muted }}>{generating ? '正在生成事实草稿…' : '加载事实中…'}</div>
                            ) : facts.length > 0 ? (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {facts.map((fact, index) => (
                                        <li className="ld-review-card" key={fact.fact_id} style={{ padding: 12, borderRadius: 8, marginBottom: 8, background: '#fff', border: '1px solid #f1f5f9' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                                <div>
                                                    <div style={{ fontWeight: 800 }}>{cleanDisplayText(fact.title, `事实 ${index + 1}`)}</div>
                                                    <div style={{ color: tokens.muted, marginTop: 6 }}>{fact.description || '暂无说明'}</div>
                                                </div>
                                                <div style={{ color: tokens.muted, fontSize: 12 }}>事实 {index + 1}</div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : evidences.length === 0 ? (
                                <div style={{ color: tokens.muted }}>暂无正式证据。请先完成证据流程。</div>
                            ) : drafts.length === 0 ? (
                                <div style={{ color: tokens.muted }}>暂无事实草稿。系统将自动尝试生成。</div>
                            ) : (
                                <div>
                                    {drafts.map((draft) => {
                                        const isEditing = editingDraftId === draft.draft_id
                                        const sourceTitles = sourceIdsOf(draft)
                                            .map((id) => evidenceTitleById.get(id))
                                            .filter((title): title is string => Boolean(title))
                                        return (
                                            <article className="ld-review-card" key={draft.draft_id} style={{ padding: 16, borderRadius: 10, marginBottom: 12, background: '#fff', border: '1px solid #f1f5f9' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                                                    <div style={{ flex: 1 }}>
                                                        {fieldLabel('标题')}
                                                        {isEditing ? (
                                                            <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6', fontWeight: 700 }} />
                                                        ) : (
                                                            <div className="ld-review-card-title" style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.5 }}>{cleanDisplayText(draft.title, '待确认事实')}</div>
                                                        )}
                                                    </div>
                                                    <div style={{ color: draft.review_status === 'pending' ? '#92400e' : '#047857', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>{statusLabel(draft.review_status)}</div>
                                                </div>

                                                <div style={{ marginTop: 12 }}>
                                                    {fieldLabel('摘要')}
                                                    {isEditing ? (
                                                        <textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} style={{ width: '100%', minHeight: 86, padding: 8, borderRadius: 6, border: '1px solid #e6eef6' }} />
                                                    ) : (
                                                        <div style={{ color: tokens.muted, lineHeight: 1.7 }}>{cleanDisplayText(draft.description, '暂无摘要')}</div>
                                                    )}
                                                </div>

                                                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                    <div>
                                                        {fieldLabel('来源证据')}
                                                        <div className="ld-source-relation" style={{ color: tokens.muted, lineHeight: 1.7 }}>{sourceTitles.length > 0 ? sourceTitles.join('、') : '未匹配来源证据'}</div>
                                                    </div>
                                                    <div>
                                                        {fieldLabel('可信度')}
                                                        <div style={{ color: tokens.muted, lineHeight: 1.7 }}>{formatConfidence(draft.confidence)}</div>
                                                    </div>
                                                </div>

                                                <div style={{ marginTop: 12 }}>
                                                    {fieldLabel('AI判断')}
                                                    <div style={{ color: tokens.muted, lineHeight: 1.7 }}>{cleanDisplayText(draft.ai_reasoning, '基于已确认的证据自动归纳。')}</div>
                                                </div>

                                                <div className="ld-review-actions" style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                    {isEditing ? (
                                                        <>
                                                            <button onClick={() => setEditingDraftId(null)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e6e7ef', background: '#fff' }}>取消</button>
                                                            <button onClick={() => saveEdit(draft.draft_id)} style={{ padding: '7px 10px', borderRadius: 8, border: 'none', background: tokens.blue, color: '#fff', fontWeight: 700 }}>保存修改</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button disabled={Boolean(draft.published_at)} onClick={() => acceptDraft(draft.draft_id)} style={{ padding: '7px 10px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontWeight: 700 }}>接受</button>
                                                            <button disabled={Boolean(draft.published_at)} onClick={() => startEdit(draft)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e6e7ef', background: '#fff' }}>修改</button>
                                                            <button disabled={Boolean(draft.published_at)} onClick={() => ignoreDraft(draft.draft_id)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e6e7ef', background: '#fff' }}>忽略</button>
                                                        </>
                                                    )}
                                                </div>
                                            </article>
                                        )
                                    })}
                                    {!allDraftsReviewed ? <div style={{ color: '#92400e', marginTop: 8 }}>请先完成全部事实草稿审核。</div> : null}
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                    <button disabled={!canContinueAi} onClick={() => router.push(`/matters/${matterId}/issues`)} style={{ width: 720, maxWidth: '90%', padding: '12px 16px', background: canContinueAi ? '#111827' : '#94a3b8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, cursor: canContinueAi ? 'pointer' : 'default' }}>AI 继续工作</button>
                </div>
            </div>
        </div>
    )
}
