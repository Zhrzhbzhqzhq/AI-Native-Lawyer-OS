"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const tokens = {
    pageBg: '#f7fafc',
    cardBg: '#ffffff',
    border: '#e6eef6',
    text: '#0f172a',
    muted: '#6b7280',
    blue: '#2563eb',
    radius: 10,
}

export default function FactsWorkspace() {
    const params = useParams() as { matter_id?: string }
    const matterId = params?.matter_id || 'demo-001'

    const [evidences, setEvidences] = useState<any[]>([])
    const [loadingEvidences, setLoadingEvidences] = useState<boolean>(true)
    const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([])

    const [facts, setFacts] = useState<any[]>([])
    const [loadingFacts, setLoadingFacts] = useState<boolean>(true)

    const [showCreate, setShowCreate] = useState<boolean>(false)
    const [newTitle, setNewTitle] = useState<string>('')
    const [newDescription, setNewDescription] = useState<string>('')
    const [creating, setCreating] = useState<boolean>(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const base = (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:4000'

    async function fetchEvidences() {
        setLoadingEvidences(true)
        try {
            const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/evidence`)
            if (!res.ok) throw new Error('加载证据失败')
            const json = await res.json()
            setEvidences(Array.isArray(json) ? json.map((e: any, idx: number) => ({ ...e, _displayIndex: idx + 1 })) : [])
        } catch (e) {
            setEvidences([])
        } finally {
            setLoadingEvidences(false)
        }
    }

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

    useEffect(() => {
        if (!matterId) return
        fetchEvidences()
        fetchFacts()
    }, [matterId])

    function toggleSelectEvidence(eid: string) {
        setSelectedEvidenceIds((s) => {
            if (s.includes(eid)) return s.filter((x) => x !== eid)
            return [...s, eid]
        })
    }

    async function createFactAndAttach() {
        setErrorMsg(null)
        if (!newTitle || newTitle.trim().length === 0) {
            setErrorMsg('标题为必填')
            return
        }
        setCreating(true)
        try {
            const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/facts`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle.trim(), description: newDescription || '' })
            })
            if (!res.ok) {
                const txt = await res.text().catch(() => '')
                throw new Error(`创建事实失败 ${res.status} ${txt}`)
            }
            const created = await res.json()
            const createdFactId = created.fact_id || created.factId || created.id || null
            if (createdFactId && Array.isArray(selectedEvidenceIds) && selectedEvidenceIds.length > 0) {
                for (const ev of selectedEvidenceIds) {
                    try {
                        await fetch(`${base}/matters/${encodeURIComponent(matterId)}/facts/${encodeURIComponent(createdFactId)}/evidence`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evidence_id: ev })
                        })
                    } catch (e) {
                        // ignore per-item errors but log
                        console.error('attach failed', e)
                    }
                }
            }

            // refresh facts
            await fetchFacts()
            setShowCreate(false)
            setNewTitle('')
            setNewDescription('')
            setSelectedEvidenceIds([])
        } catch (err: any) {
            setErrorMsg(String(err?.message || err))
        } finally {
            setCreating(false)
        }
    }

    return (
        <div style={{ padding: 16, background: tokens.pageBg, minHeight: '100vh' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ display: 'flex', gap: 16 }}>
                    {/* Left: Evidence */}
                    <div style={{ flex: 1 }}>
                        <div style={{ background: tokens.cardBg, padding: 12, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 800 }}>证据池</div>
                                <div style={{ color: tokens.muted }}>{loadingEvidences ? '加载中…' : `${evidences.length} 条`}</div>
                            </div>

                            <div style={{ marginTop: 12 }}>
                                {loadingEvidences ? (
                                    <div style={{ color: tokens.muted }}>加载证据中…</div>
                                ) : evidences.length === 0 ? (
                                    <div style={{ color: tokens.muted }}>暂无证据</div>
                                ) : (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        {evidences.map((e) => (
                                            <li key={e.evidence_id} style={{ padding: 8, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input type="checkbox" checked={selectedEvidenceIds.includes(e.evidence_id)} onChange={() => toggleSelectEvidence(e.evidence_id)} />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700 }}>{e.title || '未命名证据'}</div>
                                                    <div style={{ color: tokens.muted, fontSize: 12 }}>{e.status || '未知状态'} • 证据 {e._displayIndex}</div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Facts */}
                    <div style={{ width: 420 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontWeight: 800 }}>事实（Facts）</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setShowCreate(true)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e6e7ef', background: '#fff', fontWeight: 700 }}>根据所选证据创建事实</button>
                            </div>
                        </div>

                        <div style={{ background: tokens.cardBg, padding: 12, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                            {loadingFacts ? (
                                <div style={{ color: tokens.muted }}>加载事实中…</div>
                            ) : facts.length === 0 ? (
                                <div style={{ color: tokens.muted }}>暂无事实</div>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {facts.map((f: any) => (
                                        <li key={f.fact_id} style={{ padding: 10, borderBottom: '1px solid #f3f6f9' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>{f.title}</div>
                                                    <div style={{ color: tokens.muted, fontSize: 12 }}>{f.status || 'draft'}</div>
                                                </div>
                                                <div style={{ color: tokens.muted, fontSize: 12 }}>{f.created_at ? new Date(f.created_at).toLocaleString() : ''}</div>
                                            </div>
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
                                <div style={{ fontWeight: 800 }}>新建事实</div>
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
                                <button onClick={() => createFactAndAttach()} disabled={creating} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: tokens.blue, color: '#fff' }}>{creating ? '保存中…' : '保存'}</button>
                            </div>
                        </div>
                    </div>
                ) : null}

            </div>
        </div>
    )
}
