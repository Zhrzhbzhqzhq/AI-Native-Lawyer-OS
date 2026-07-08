"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

const tokens = {
    pageBg: '#ffffff',
    cardBg: '#fafafa',
    border: '#e6e6e6',
    text: '#0f172a',
    muted: '#6b7280',
    radius: 8,
}

export default function LawsWorkspace() {
    const params = useParams() as { matter_id?: string }
    const matterId = params?.matter_id || 'demo-001'
    const router = useRouter()

    const [issues, setIssues] = useState<any[]>([])
    const [loadingIssues, setLoadingIssues] = useState<boolean>(true)
    const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)

    const [laws, setLaws] = useState<any[]>([])
    const [loadingLaws, setLoadingLaws] = useState<boolean>(true)
    const [selectedLawId, setSelectedLawId] = useState<string | null>(null)

    const [showCreate, setShowCreate] = useState<boolean>(false)
    const [newTitle, setNewTitle] = useState<string>('')
    const [newCitation, setNewCitation] = useState<string>('')
    const [newDescription, setNewDescription] = useState<string>('')
    const [newIssueId, setNewIssueId] = useState<string | undefined>(undefined)
    const [creating, setCreating] = useState<boolean>(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const [editingLawId, setEditingLawId] = useState<string | null>(null)
    const [editingPatch, setEditingPatch] = useState<any>({})
    const [savingEdit, setSavingEdit] = useState<boolean>(false)
    // AI suggestions state
    const [suggestions, setSuggestions] = useState<Array<{ title: string; citation?: string; description: string; id?: string }>>([])
    const [analyzing, setAnalyzing] = useState<boolean>(false)

    const base = (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:4000'

    async function fetchIssues() {
        setLoadingIssues(true)
        try {
            const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/issues`)
            if (!res.ok) throw new Error('加载议题失败')
            const json = await res.json()
            setIssues(Array.isArray(json) ? json : [])
        } catch (e) {
            setIssues([])
        } finally {
            setLoadingIssues(false)
        }
    }

    async function fetchLaws() {
        setLoadingLaws(true)
        try {
            const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/laws`)
            if (!res.ok) throw new Error('加载法规失败')
            const json = await res.json()
            setLaws(Array.isArray(json) ? json : [])
        } catch (e) {
            setLaws([])
        } finally {
            setLoadingLaws(false)
        }
    }

    useEffect(() => {
        if (!matterId) return
        fetchIssues()
        fetchLaws()
    }, [matterId])

    async function createLaw() {
        setErrorMsg(null)
        if (!newTitle || newTitle.trim().length === 0) { setErrorMsg('标题为必填'); return }
        setCreating(true)
        try {
            const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/laws`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle.trim(), citation: newCitation || '', description: newDescription || '', issue_id: newIssueId }) })
            if (!res.ok) { const txt = await res.text().catch(() => ''); throw new Error(`创建法规失败 ${res.status} ${txt}`) }
            await fetchLaws()
            setShowCreate(false)
            setNewTitle(''); setNewCitation(''); setNewDescription(''); setNewIssueId(undefined)
        } catch (e: any) { setErrorMsg(String(e?.message || e)) } finally { setCreating(false) }
    }

    function openLaw(lawId: string) { setSelectedLawId(lawId); setEditingLawId(null); setEditingPatch({}) }

    function startEdit(law: any) { setEditingLawId(law.law_id); setEditingPatch({ title: law.title, citation: law.citation || '', description: law.description || '', status: law.status || 'draft', issue_id: law.issue_id || '' }) }

    async function saveEdit(lawId: string) {
        setSavingEdit(true)
        try {
            const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/laws/${encodeURIComponent(lawId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingPatch) })
            if (!res.ok) { const txt = await res.text().catch(() => ''); throw new Error(`保存失败 ${res.status} ${txt}`) }
            await fetchLaws()
            setEditingLawId(null)
            if (selectedLawId === lawId) openLaw(lawId)
        } catch (e: any) { setErrorMsg(String(e?.message || e)) } finally { setSavingEdit(false) }
    }

    async function deleteLaw(lawId: string) {
        try {
            const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/laws/${encodeURIComponent(lawId)}`, { method: 'DELETE' })
            if (!res.ok) { const txt = await res.text().catch(() => ''); throw new Error(`删除失败 ${res.status} ${txt}`) }
            await fetchLaws()
            if (selectedLawId === lawId) setSelectedLawId(null)
        } catch (e: any) { setErrorMsg(String(e?.message || e)) }
    }

    return (
        <div style={{ padding: 16, background: tokens.pageBg, minHeight: '100vh' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ display: 'flex', gap: 16 }}>
                    {/* Left: Issues */}
                    <div style={{ flex: 1 }}>
                        <div style={{ background: tokens.cardBg, padding: 12, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 800 }}>议题（Issues）</div>
                                <div style={{ color: tokens.muted }}>{loadingIssues ? '加载中…' : `${issues.length} 条`}</div>
                            </div>

                            <div style={{ marginTop: 12 }}>
                                {loadingIssues ? <div style={{ color: tokens.muted }}>加载议题中…</div> : issues.length === 0 ? <div style={{ color: tokens.muted }}>暂无议题</div> : (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        {issues.map((it: any) => {
                                            const isSel = selectedIssueId === it.issue_id
                                            return (
                                                <li key={it.issue_id} onClick={() => setSelectedIssueId((s) => s === it.issue_id ? null : it.issue_id)} style={{ padding: 8, borderBottom: '1px solid #f1f1f1', cursor: 'pointer', background: isSel ? '#f3f4f6' : 'transparent', borderLeft: isSel ? '3px solid #111' : '3px solid transparent' }}>
                                                    <div style={{ fontWeight: 700 }}>{it.title}</div>
                                                    <div style={{ color: tokens.muted, fontSize: 12 }}>{it.status || 'draft'}</div>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                            </div>
                            {/* 下一步 按钮 */}
                            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                                <button onClick={() => router.push(`/matters/${matterId}/arguments`)} style={{ width: 720, maxWidth: '90%', padding: '12px 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800 }}>下一步：形成法律论证</button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Laws */}
                    <div style={{ width: 520 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontWeight: 800 }}>法规（Laws）</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setShowCreate(true)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e6e7ef', background: '#fff', fontWeight: 700 }}>新建法规</button>
                                <button disabled={analyzing} onClick={async () => {
                                    setAnalyzing(true)
                                    try {
                                        const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/laws/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
                                        if (!res.ok) throw new Error(`status:${res.status}`)
                                        const json = await res.json()
                                        const s = Array.isArray(json) ? json.map((it: any, i: number) => ({ id: it.id || `s-${i}`, title: String(it.title || ''), citation: String(it.document_type || it.citation || ''), description: String(it.description || it.content || '') })) : []
                                        setSuggestions(s)
                                    } catch (e) {
                                        console.error('laws analyze failed', e)
                                        setSuggestions([])
                                    } finally {
                                        setAnalyzing(false)
                                    }
                                }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e6e7ef', background: '#fff', fontWeight: 700 }}>{analyzing ? 'AI 正在推荐法律依据……' : 'AI 推荐法律依据'}</button>
                            </div>
                        </div>

                        <div style={{ background: tokens.cardBg, padding: 12, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                            {loadingLaws ? (
                                <div style={{ color: tokens.muted }}>加载法规中…</div>
                            ) : laws.length === 0 ? (
                                <div style={{ color: tokens.muted }}>暂无法律依据</div>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {laws.map((law: any) => (
                                        <li key={law.law_id} style={{ padding: 10, borderBottom: '1px solid #f3f3f3' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                                <div style={{ cursor: 'pointer' }} onClick={() => openLaw(law.law_id)}>
                                                    <div style={{ fontWeight: 700 }}>{law.title}</div>
                                                    <div style={{ color: tokens.muted, fontSize: 12 }}>{law.citation || ''} • {law.status || 'draft'}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => startEdit(law)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e6eef6', background: '#fff', fontSize: 12 }}>编辑</button>
                                                    <button onClick={() => deleteLaw(law.law_id)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fff', color: '#b91c1c', fontSize: 12 }}>删除</button>
                                                </div>
                                            </div>

                                            {selectedLawId === law.law_id ? (
                                                <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: '#fff' }}>
                                                    <div style={{ fontWeight: 700, marginBottom: 6 }}>说明</div>
                                                    <div style={{ color: tokens.muted }}>{law.description || '—'}</div>
                                                    <div style={{ marginTop: 8, fontWeight: 700 }}>关联议题</div>
                                                    <div style={{ color: tokens.muted }}>{law.issue_id || '未关联'}</div>
                                                </div>
                                            ) : null}

                                            {editingLawId === law.law_id ? (
                                                <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: '#fff' }}>
                                                    <div style={{ fontWeight: 700, marginBottom: 6 }}>编辑法规</div>
                                                    <div style={{ marginBottom: 8 }}>
                                                        <input value={editingPatch.title || ''} onChange={(e) => setEditingPatch((p: any) => ({ ...p, title: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6' }} />
                                                    </div>
                                                    <div style={{ marginBottom: 8 }}>
                                                        <input value={editingPatch.citation || ''} onChange={(e) => setEditingPatch((p: any) => ({ ...p, citation: e.target.value }))} placeholder="引用" style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6' }} />
                                                    </div>
                                                    <div style={{ marginBottom: 8 }}>
                                                        <textarea value={editingPatch.description || ''} onChange={(e) => setEditingPatch((p: any) => ({ ...p, description: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6', minHeight: 80 }} />
                                                    </div>
                                                    <div style={{ marginBottom: 8 }}>
                                                        <select value={editingPatch.issue_id || ''} onChange={(e) => setEditingPatch((p: any) => ({ ...p, issue_id: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6' }}>
                                                            <option value="">不关联</option>
                                                            {issues.map((it: any) => <option key={it.issue_id} value={it.issue_id}>{it.title}</option>)}
                                                        </select>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                                        <button onClick={() => setEditingLawId(null)} style={{ padding: '6px 10px', borderRadius: 6 }}>取消</button>
                                                        <button onClick={() => saveEdit(law.law_id)} disabled={savingEdit} style={{ padding: '6px 10px', borderRadius: 6, background: '#111', color: '#fff' }}>{savingEdit ? '保存中…' : '保存'}</button>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Suggestions area */}
                <div style={{ maxWidth: 1200, margin: '12px auto 0', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: 520, background: '#fff', borderRadius: tokens.radius, padding: 12, border: `1px solid ${tokens.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 700 }}>AI 建议</div>
                            {suggestions && suggestions.length > 0 ? (
                                <button onClick={async () => {
                                    for (const s of suggestions.slice()) {
                                        try {
                                            const body: any = { title: s.title, citation: s.citation || '', description: s.description }
                                            if (selectedIssueId) body.issue_id = selectedIssueId
                                            const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/laws`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                                            if (!res.ok) throw new Error(`status:${res.status}`)
                                        } catch (e) {
                                            console.error('accept all laws failed', e)
                                        }
                                    }
                                    try { await fetchLaws() } catch (e) { }
                                    setSuggestions([])
                                }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e6e7ef', background: '#fff', fontWeight: 700 }}>全部接受</button>
                            ) : null}
                        </div>

                        {suggestions && suggestions.length > 0 ? (
                            <div style={{ marginTop: 10 }}>
                                {suggestions.map((s) => (
                                    <div key={s.id} style={{ padding: 10, borderRadius: 8, marginBottom: 8, background: '#fff', border: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontWeight: 700 }}>{s.title}</div>
                                                <div style={{ color: tokens.muted, marginTop: 6 }}>{s.citation}</div>
                                                <div style={{ color: tokens.muted, marginTop: 6 }}>{s.description}</div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                                                <button onClick={async () => {
                                                    try {
                                                        const body: any = { title: s.title, citation: s.citation || '', description: s.description }
                                                        if (selectedIssueId) body.issue_id = selectedIssueId
                                                        const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/laws`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                                                        if (!res.ok) throw new Error(`status:${res.status}`)
                                                        setSuggestions((prev) => prev.filter((x) => x.id !== s.id))
                                                        try { await fetchLaws() } catch (e) { }
                                                    } catch (e) {
                                                        console.error('accept law failed', e)
                                                        alert('创建法规失败，请稍后重试')
                                                    }
                                                }} style={{ padding: '6px 10px', borderRadius: 6, background: '#111827', color: '#fff', border: 'none' }}>接受</button>

                                                <button onClick={() => setSuggestions((prev) => prev.filter((x) => x.id !== s.id))} style={{ padding: '6px 10px', borderRadius: 6, background: '#fff', color: '#111827', border: '1px solid #e6e7ef' }}>忽略</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ marginTop: 10, color: tokens.muted }}>AI 建议将显示在此处</div>
                        )}
                    </div>
                </div>
            </div>

            {showCreate ? (
                <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 560, background: '#fff', borderRadius: 8, padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800 }}>新建法规</div>
                            <div><button onClick={() => { setShowCreate(false); setErrorMsg(null) }} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>关闭</button></div>
                        </div>

                        <div style={{ marginTop: 12 }}>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>标题</div>
                            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6' }} />
                        </div>

                        <div style={{ marginTop: 12 }}>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>引用（可选）</div>
                            <input value={newCitation} onChange={(e) => setNewCitation(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6' }} />
                        </div>

                        <div style={{ marginTop: 12 }}>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>说明（可选）</div>
                            <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6', minHeight: 100 }} />
                        </div>

                        <div style={{ marginTop: 12 }}>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>关联议题（可选）</div>
                            <select value={newIssueId || ''} onChange={(e) => setNewIssueId(e.target.value || undefined)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6' }}>
                                <option value="">不关联</option>
                                {issues.map((it: any) => <option key={it.issue_id} value={it.issue_id}>{it.title}</option>)}
                            </select>
                        </div>

                        {errorMsg ? <div style={{ color: '#b91c1c', marginTop: 8 }}>{errorMsg}</div> : null}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                            <button onClick={() => { setShowCreate(false); setErrorMsg(null) }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e7eb', background: '#fff' }}>取消</button>
                            <button onClick={() => createLaw()} disabled={creating} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#111', color: '#fff' }}>{creating ? '保存中…' : '保存'}</button>
                        </div>
                    </div>
                </div>
            ) : null}

        </div>
    )
}
