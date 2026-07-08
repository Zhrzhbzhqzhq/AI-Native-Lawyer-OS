"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

const tokens = {
    pageBg: '#f7fafc',
    cardBg: '#ffffff',
    border: '#e6eef6',
    text: '#0f172a',
    muted: '#6b7280',
    blue: '#2563eb',
    radius: 10,
}

export default function IssuesWorkspace() {
    const params = useParams() as { matter_id?: string }
    const matterId = params?.matter_id || 'demo-001'
    const router = useRouter()

    const [facts, setFacts] = useState<any[]>([])
    const [loadingFacts, setLoadingFacts] = useState<boolean>(true)
    const [selectedFactIds, setSelectedFactIds] = useState<string[]>([])
    const [factQuery, setFactQuery] = useState<string>('')

    const [issues, setIssues] = useState<any[]>([])
    const [loadingIssues, setLoadingIssues] = useState<boolean>(true)
    const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
    const [issueFacts, setIssueFacts] = useState<any[]>([])
    const [loadingIssueFacts, setLoadingIssueFacts] = useState<boolean>(false)

    const [showCreate, setShowCreate] = useState<boolean>(false)
    const [newTitle, setNewTitle] = useState<string>('')
    const [newDescription, setNewDescription] = useState<string>('')
    const [creating, setCreating] = useState<boolean>(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    // AI suggestions state
    const [suggestions, setSuggestions] = useState<Array<{ title: string; description: string; id?: string }>>([])
    const [analyzing, setAnalyzing] = useState<boolean>(false)

    const base = (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:4000'

    async function fetchFacts() {
        setLoadingFacts(true)
        try {
            const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/facts`)
            if (!res.ok) throw new Error('加载事实失败')
            const json = await res.json()
            setFacts(Array.isArray(json) ? json : [])
        } catch (e) {
            setFacts([])
        } finally {
            setLoadingFacts(false)
        }
    }

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

    async function fetchIssueFacts(issueId: string | null) {
        if (!issueId) {
            setIssueFacts([])
            return
        }
        setLoadingIssueFacts(true)
        try {
            const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/issues/${encodeURIComponent(issueId)}/facts`)
            if (!res.ok) throw new Error('加载关联事实失败')
            const json = await res.json()
            setIssueFacts(Array.isArray(json) ? json : [])
        } catch (e) {
            setIssueFacts([])
        } finally {
            setLoadingIssueFacts(false)
        }
    }

    useEffect(() => {
        if (!matterId) return
        fetchFacts()
        fetchIssues()
    }, [matterId])

    function toggleSelectFact(fid: string) {
        setSelectedFactIds((s) => {
            if (s.includes(fid)) return s.filter((x) => x !== fid)
            return [...s, fid]
        })
    }

    function filteredFacts() {
        const q = String(factQuery || '').trim().toLowerCase()
        if (!q) return facts
        return facts.filter((f: any) => String(f.title || '').toLowerCase().includes(q))
    }

    async function createIssueAndAttach() {
        setErrorMsg(null)
        if (!newTitle || newTitle.trim().length === 0) {
            setErrorMsg('标题为必填')
            return
        }
        setCreating(true)
        try {
            const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/issues`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle.trim(), description: newDescription || '' })
            })
            if (!res.ok) {
                const txt = await res.text().catch(() => '')
                throw new Error(`创建议题失败 ${res.status} ${txt}`)
            }
            const created = await res.json()
            const createdIssueId = created.issue_id || created.id || null
            if (createdIssueId && Array.isArray(selectedFactIds) && selectedFactIds.length > 0) {
                for (const fid of selectedFactIds) {
                    try {
                        await fetch(`${base}/matters/${encodeURIComponent(matterId)}/issues/${encodeURIComponent(createdIssueId)}/facts`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fact_id: fid })
                        })
                    } catch (e) {
                        console.error('attach fact failed', e)
                    }
                }
            }

            await fetchIssues()
            setShowCreate(false)
            setNewTitle('')
            setNewDescription('')
            setSelectedFactIds([])
        } catch (err: any) {
            setErrorMsg(String(err?.message || err))
        } finally {
            setCreating(false)
        }
    }

    async function openIssue(issueId: string) {
        setSelectedIssueId(issueId)
        await fetchIssueFacts(issueId)
    }

    async function removeFactFromIssue(issueId: string, factId: string) {
        try {
            const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/issues/${encodeURIComponent(issueId)}/facts/${encodeURIComponent(factId)}`, { method: 'DELETE' })
            if (!res.ok) {
                const txt = await res.text().catch(() => '')
                throw new Error(`删除关联失败 ${res.status} ${txt}`)
            }
            // refresh only current issue facts
            await fetchIssueFacts(issueId)
        } catch (e: any) {
            console.error('detach failed', e)
            setErrorMsg(String(e?.message || e))
        }
    }

    return (
        <div style={{ padding: 16, background: tokens.pageBg, minHeight: '100vh' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ display: 'flex', gap: 16 }}>
                    {/* Left: Facts */}
                    <div style={{ flex: 1 }}>
                        <div style={{ background: tokens.cardBg, padding: 12, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 800 }}>事实（Facts）</div>
                                <div style={{ color: tokens.muted }}>{loadingFacts ? '加载中…' : `${facts.length} 条`}</div>
                            </div>

                            <div style={{ marginTop: 12, marginBottom: 8, display: 'flex', gap: 8 }}>
                                <input placeholder="搜索事实" value={factQuery} onChange={(e) => setFactQuery(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #e6eef6' }} />
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <button onClick={() => { setSelectedFactIds(filteredFacts().map((f: any) => f.fact_id)) }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e6e7ef', background: '#fff', fontWeight: 700 }}>全选</button>
                                </div>
                            </div>

                            <div>
                                {loadingFacts ? (
                                    <div style={{ color: tokens.muted }}>加载事实中…</div>
                                ) : filteredFacts().length === 0 ? (
                                    <div style={{ color: tokens.muted }}>暂无事实</div>
                                ) : (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        {filteredFacts().map((f: any) => (
                                            <li key={f.fact_id} style={{ padding: 8, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input type="checkbox" checked={selectedFactIds.includes(f.fact_id)} onChange={() => toggleSelectFact(f.fact_id)} />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700 }}>{f.title}</div>
                                                    <div style={{ color: tokens.muted, fontSize: 12 }}>{f.status || 'draft'}</div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* AI Suggestions box */}
                    <div style={{ marginTop: 12, background: tokens.cardBg, padding: 12, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800 }}>AI 建议</div>
                            {suggestions && suggestions.length > 0 ? (
                                <button onClick={async () => {
                                    for (const s of suggestions.slice()) {
                                        try {
                                            const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/issues`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: s.title, description: s.description }) })
                                            if (!res.ok) throw new Error(`status:${res.status}`)
                                        } catch (e) {
                                            console.error('accept all issues failed', e)
                                        }
                                    }
                                    try { await fetchIssues() } catch (e) { }
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
                                                <div style={{ color: tokens.muted, marginTop: 6 }}>{s.description}</div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                                                <button onClick={async () => {
                                                    try {
                                                        const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/issues`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: s.title, description: s.description }) })
                                                        if (!res.ok) throw new Error(`status:${res.status}`)
                                                        setSuggestions((prev) => prev.filter((x) => x.id !== s.id))
                                                        try { await fetchIssues() } catch (e) { }
                                                    } catch (e) {
                                                        console.error('accept issue failed', e)
                                                        alert('创建议题失败，请稍后重试')
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

                    {/* Right: Issues */}
                    <div style={{ width: 520 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontWeight: 800 }}>议题（Issues）</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setShowCreate(true)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e6e7ef', background: '#fff', fontWeight: 700 }}>新建议题</button>
                                <button disabled={analyzing} onClick={async () => {
                                    setAnalyzing(true)
                                    try {
                                        const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/issues/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
                                        if (!res.ok) throw new Error(`status:${res.status}`)
                                        const json = await res.json()
                                        const s = Array.isArray(json) ? json.map((it: any, i: number) => ({ id: it.id || `s-${i}`, title: String(it.title || ''), description: String(it.description || it.reason || '') })) : []
                                        setSuggestions(s)
                                    } catch (e) {
                                        console.error('issues analyze failed', e)
                                        setSuggestions([])
                                    } finally {
                                        setAnalyzing(false)
                                    }
                                }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e6e7ef', background: '#fff', fontWeight: 700 }}>{analyzing ? 'AI 正在提炼争议焦点……' : 'AI 提炼争议焦点'}</button>
                            </div>
                        </div>

                        <div style={{ background: tokens.cardBg, padding: 12, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                            {loadingIssues ? (
                                <div style={{ color: tokens.muted }}>加载议题中…</div>
                            ) : issues.length === 0 ? (
                                <div style={{ color: tokens.muted }}>暂无议题</div>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {issues.map((it: any) => (
                                        <li key={it.issue_id} style={{ padding: 10, borderBottom: '1px solid #f3f6f9' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }} onClick={async () => { await openIssue(it.issue_id) }}>
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>{it.title}</div>
                                                    <div style={{ color: tokens.muted, fontSize: 12 }}>{it.status || 'draft'} • 优先级 {it.priority || 'medium'}</div>
                                                </div>
                                                <div style={{ color: tokens.muted, fontSize: 12 }}>{it.created_at ? new Date(it.created_at).toLocaleString() : ''}</div>
                                            </div>

                                            {selectedIssueId === it.issue_id ? (
                                                <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: '#fafafa' }}>
                                                    <div style={{ fontWeight: 700, marginBottom: 6 }}>议题详情</div>
                                                    <div style={{ marginBottom: 8 }}>
                                                        <div style={{ fontWeight: 700 }}>标题</div>
                                                        <div style={{ color: tokens.muted }}>{it.title}</div>
                                                    </div>

                                                    <div style={{ marginBottom: 8 }}>
                                                        <div style={{ fontWeight: 700 }}>说明</div>
                                                        <div style={{ color: tokens.muted }}>{it.description || '—'}</div>
                                                    </div>

                                                    <div style={{ marginBottom: 8 }}>
                                                        <div style={{ fontWeight: 700 }}>状态 / 优先级</div>
                                                        <div style={{ color: tokens.muted }}>{it.status || 'draft'} • {it.priority || 'medium'}</div>
                                                    </div>

                                                    <div style={{ fontWeight: 700, marginBottom: 6 }}>关联事实</div>
                                                    {loadingIssueFacts ? (
                                                        <div style={{ color: tokens.muted }}>加载中…</div>
                                                    ) : issueFacts.length === 0 ? (
                                                        <div style={{ color: tokens.muted }}>暂无关联事实</div>
                                                    ) : (
                                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                            {issueFacts.map((f: any) => (
                                                                <li key={f.fact_id} style={{ padding: '6px 0' }}>
                                                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                                            <div style={{ fontWeight: 700 }}>{f.title || f.fact_id}</div>
                                                                            <div style={{ color: tokens.muted, fontSize: 12 }}>{f.status || ''}</div>
                                                                        </div>
                                                                        <div>
                                                                            <button onClick={() => removeFactFromIssue(it.issue_id, f.fact_id)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e6eef6', background: '#fff', color: tokens.muted, fontSize: 12 }}>移除关联</button>
                                                                        </div>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            ) : null}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                {/* Create dialog */}
                {showCreate ? (
                    <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 560, background: '#fff', borderRadius: 8, padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 800 }}>新建议题</div>
                                <div><button onClick={() => { setShowCreate(false); setErrorMsg(null) }} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>关闭</button></div>
                            </div>

                            <div style={{ marginTop: 12 }}>
                                <div style={{ fontWeight: 700, marginBottom: 6 }}>标题</div>
                                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6' }} />
                            </div>

                            <div style={{ marginTop: 12 }}>
                                <div style={{ fontWeight: 700, marginBottom: 6 }}>说明（可选）</div>
                                <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6', minHeight: 100 }} />
                            </div>

                            {errorMsg ? <div style={{ color: '#b91c1c', marginTop: 8 }}>{errorMsg}</div> : null}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                                <button onClick={() => { setShowCreate(false); setErrorMsg(null) }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e7eb', background: '#fff' }}>取消</button>
                                <button onClick={() => createIssueAndAttach()} disabled={creating} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: tokens.blue, color: '#fff' }}>{creating ? '保存中…' : '保存并关联所选事实'}</button>
                            </div>
                        </div>
                    </div>
                ) : null}

            </div>
            {/* 下一步 按钮 */}
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => router.push(`/matters/${matterId}/laws`)} style={{ width: 720, maxWidth: '90%', padding: '12px 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800 }}>下一步：查找适用法律</button>
            </div>
        </div>
    )
}
