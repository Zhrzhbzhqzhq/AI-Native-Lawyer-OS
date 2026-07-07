"use client"
import React from 'react'
import { useState, useEffect, useMemo } from 'react'
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

const mock = {
    proofGoal: '借贷关系成立',
    evidences: [
        { id: 'e1', title: '借条（签字）', type: '文书', date: '2025-11-02', strength: 90, notes: '原件在客户处' },
        { id: 'e2', title: '银行转账记录', type: '银行凭证', date: '2025-11-03', strength: 95, notes: '截屏，有交易流水' },
        { id: 'e3', title: '微信聊天截图', type: '社交记录', date: '2025-11-04', strength: 60, notes: '部分关键内容已删除' },
        { id: 'e4', title: '催收短信', type: '通信', date: '2026-01-12', strength: 50, notes: '可作为补强' },
    ],
    proofMap: {
        nodes: [
            { id: 'n1', label: '借款合意' },
            { id: 'n2', label: '资金交付' },
            { id: 'n3', label: '未归还' },
        ],
        links: [
            ['n1', 'n2'],
            ['n2', 'n3'],
        ],
    },
    gaps: [
        { id: 'g1', title: '缺原始银行流水', impact: '高' },
        { id: 'g2', title: '借条签字原件未拍照', impact: '中' },
    ],
    discoveries: [
        { id: 'd1', text: 'AI 发现付款备注显示“借款”字样，支持资金交付。', confidence: 0.88 },
        { id: 'd2', text: '疑似第三方资金流转，应核实账户归属。', confidence: 0.62 },
    ],
    timeline: [
        { id: 't1', text: '2025-11-02 借条签署', time: '2025-11-02' },
        { id: 't2', text: '2025-11-03 转账发生', time: '2025-11-03' },
        { id: 't3', text: '2026-01-12 客户发起催收', time: '2026-01-12' },
    ],
    score: 78,
}

function ProgressBar({ value, color = tokens.blue, height = 10 }: { value: number; color?: string; height?: number }) {
    return (
        <div style={{ background: '#eef2f7', borderRadius: 999, height }}>
            <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: color, borderRadius: 999 }} />
        </div>
    )
}

export default function EvidencePage() {
    const params = useParams() as { matter_id?: string }
    const router = useRouter()
    const matterId = params?.matter_id || 'demo-001'

    // fallback workspace (used initially and on fetch failure)
    const fallbackWorkspace = mock

    const [data, setData] = useState<typeof mock>(fallbackWorkspace)
    const [loading, setLoading] = useState<boolean>(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>(fallbackWorkspace.evidences[0].id)
    const [materials, setMaterials] = useState<any[]>([])
    const [loadingMaterials, setLoadingMaterials] = useState<boolean>(true)
    const [materialsConfirmed, setMaterialsConfirmed] = useState<boolean>(false)
    const [showOrganizeNotice, setShowOrganizeNotice] = useState<boolean>(false)
    const [evidenceRecords, setEvidenceRecords] = useState<any[]>([])
    const [loadingEvidence, setLoadingEvidence] = useState<boolean>(true)
    const convertedMaterialIds = useMemo(() => new Set((evidenceRecords || []).map((e: any) => e.material_id).filter(Boolean)), [evidenceRecords])
    const [convertingMaterialId, setConvertingMaterialId] = useState<string | null>(null)
    const [conversionError, setConversionError] = useState<string | null>(null)
    const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(null)
    const [editingDescription, setEditingDescription] = useState<string>('')
    const [savingDescription, setSavingDescription] = useState<boolean>(false)
    const [saveDescriptionError, setSaveDescriptionError] = useState<string | null>(null)
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
    const [statusErrorById, setStatusErrorById] = useState<Record<string, string>>({})

    // derive selected evidence from current data
    const selectedEvidence = (data?.evidences || []).find((e) => e.id === selectedEvidenceId) || (data?.evidences && data.evidences[0]) || fallbackWorkspace.evidences[0]

    useEffect(() => {
        let cancelled = false
        async function load() {
            setLoading(true)
            setErrorMsg(null)
            const base = (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:4000'
            const url = `${base}/matters/${encodeURIComponent(matterId)}/evidence/workspace`
            try {
                const res = await fetch(url)
                if (!res.ok) throw new Error(`status:${res.status}`)
                const json = await res.json()

                // require evidence_list to consider success
                if (!json || !Array.isArray(json.evidence_list)) throw new Error('missing evidence_list')

                const mapped = {
                    proofGoal: json.matter?.title || fallbackWorkspace.proofGoal,
                    evidences: (json.evidence_list || []).map((e: any, idx: number) => ({
                        id: e.evidence_id || e.id || `ev-${idx}`,
                        title: e.title || `Evidence ${idx + 1}`,
                        type: e.evidence_type || e.type || 'other',
                        date: e.updated_at || e.created_at || '',
                        strength: typeof e.relevance === 'string' && e.relevance.toLowerCase() === 'high' ? 90 : (e.relevance ? 70 : 50),
                        notes: e.description || '',
                    })),
                    proofMap: json.graph || fallbackWorkspace.proofMap,
                    // missing_evidence / gaps
                    gaps: Array.isArray(json.missing_evidence) && json.missing_evidence.length > 0 ? json.missing_evidence.map((g: any) => ({ id: g.id || g.key || String(g.title || Math.random()), title: g.title || g.description || '', impact: g.priority || g.impact || '中' })) : fallbackWorkspace.gaps,
                    // ai discoveries
                    discoveries: Array.isArray(json.ai_analysis?.discoveries) ? json.ai_analysis.discoveries : (json.ai_analysis && json.ai_analysis.message ? [json.ai_analysis.message] : fallbackWorkspace.discoveries),
                    // timeline: prefer explicit timeline, else derive from evidence_list
                    timeline: Array.isArray(json.timeline) && json.timeline.length > 0 ? json.timeline : ((Array.isArray(json.evidence_list) && json.evidence_list.length > 0) ? json.evidence_list.map((e: any, i: number) => ({ id: e.evidence_id || `ev-${i}`, text: `${e.title || '证据'}`, time: e.updated_at || e.created_at || '' })) : (json.selected_evidence?.related_timeline || fallbackWorkspace.timeline)),
                    score: json.summary && typeof json.summary.total === 'number' ? Math.round(((json.summary.accepted || 0) / Math.max(1, (json.summary.total || 1))) * 100) : fallbackWorkspace.score,
                    selected_evidence: json.selected_evidence ? {
                        id: json.selected_evidence.evidence_id || json.selected_evidence.id,
                        title: json.selected_evidence.title || json.selected_evidence.name || '',
                        type: json.selected_evidence.evidence_type || json.selected_evidence.type || '',
                        date: json.selected_evidence.updated_at || json.selected_evidence.created_at || '',
                        strength: json.selected_evidence.ai_summary && typeof json.selected_evidence.ai_summary.score === 'number' ? Number(json.selected_evidence.ai_summary.score) : (json.selected_evidence.relevance ? 70 : 50),
                        notes: json.selected_evidence.description || '',
                        ai_summary: json.selected_evidence.ai_summary || json.selected_evidence.ai_analysis || null,
                    } : null,
                    // pass through next steps and missing suggestions
                    evidence_next_steps: Array.isArray(json.evidence_next_steps) ? json.evidence_next_steps : [],
                    missing_evidence: Array.isArray(json.missing_evidence) ? json.missing_evidence : [],
                    ai_analysis: json.ai_analysis || null,
                }

                if (!cancelled) {
                    setData(mapped as any)
                    // ensure selected evidence id exists in new data
                    if (mapped.evidences && mapped.evidences.length > 0) {
                        const exist = mapped.evidences.find((x: any) => x.id === selectedEvidenceId)
                        if (!exist) setSelectedEvidenceId(mapped.evidences[0].id)
                    }
                    setLoading(false)
                }
            } catch (err: any) {
                if (!cancelled) {
                    setData(fallbackWorkspace)
                    setErrorMsg('已加载示例数据')
                    setLoading(false)
                }
            }
        }
        load()
        return () => { cancelled = true }
    }, [matterId])

    // fetch evidence records (GET /matters/:matter_id/evidence)
    async function fetchEvidence() {
        setLoadingEvidence(true)
        try {
            const base = (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:4000'
            const url = `${base}/matters/${encodeURIComponent(matterId)}/evidence`
            const res = await fetch(url)
            if (!res.ok) {
                setEvidenceRecords([])
                setLoadingEvidence(false)
                return
            }
            const d = await res.json().catch(() => [])
            setEvidenceRecords(Array.isArray(d) ? d : [])
        } catch (e) {
            console.error('load evidence failed', e)
            setEvidenceRecords([])
        } finally {
            setLoadingEvidence(false)
        }
    }

    // fetch materials (GET /matters/:matter_id/materials)
    async function fetchMaterials() {
        setLoadingMaterials(true)
        try {
            const base = (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:4000'
            const url = `${base}/matters/${encodeURIComponent(matterId)}/materials`
            const res = await fetch(url)
            if (!res.ok) {
                setMaterials([])
                setLoadingMaterials(false)
                return
            }
            const data = await res.json().catch(() => [])
            setMaterials(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error('load materials failed', e)
            setMaterials([])
        } finally {
            setLoadingMaterials(false)
        }
    }

    useEffect(() => {
        if (!matterId) return
        fetchEvidence()
    }, [matterId])

    // load materials for this matter (real uploaded files)
    useEffect(() => {
        let cancelled = false
        if (matterId) fetchMaterials()
        return () => { cancelled = true }
    }, [matterId])

    // reconcile selectedEvidenceId when data.evidences change
    useEffect(() => {
        const evidences = (data as any)?.evidences || []
        if (!Array.isArray(evidences) || evidences.length === 0) return
        const exists = evidences.some((e: any) => e.id === selectedEvidenceId)
        if (!exists) {
            setSelectedEvidenceId(evidences[0].id)
        }
    }, [(data as any)?.evidences, selectedEvidenceId])

    // fetch proof graph separately (GET /matters/:id/graph) to enrich proofMap
    useEffect(() => {
        let cancelled = false
        async function loadGraph() {
            const base = (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:4000'
            const url = `${base}/matters/${encodeURIComponent(matterId)}/graph`
            try {
                const res = await fetch(url)
                if (!res.ok) return
                const json = await res.json()
                if (!json) return
                if (!cancelled) {
                    setData((prev: any) => ({ ...prev, proofMap: json || prev.proofMap }))
                }
            } catch (e) {
                // ignore graph fetch errors; keep fallback
            }
        }
        loadGraph()
        return () => { cancelled = true }
    }, [matterId])

    // render
    const selectedAiSummary = (data as any)?.selected_evidence?.ai_summary ?? null
    const globalScore = (data as any)?.score ?? fallbackWorkspace.score
    const evidencesCount = Array.isArray((data as any)?.evidences) ? (data as any).evidences.length : fallbackWorkspace.evidences.length
    const highGapCount = Array.isArray((data as any)?.gaps) ? ((data as any).gaps.filter((g: any) => String(g.impact || '').toLowerCase() === '高' || String(g.impact || '').toLowerCase() === 'high').length) : (fallbackWorkspace.gaps.filter((g: any) => g.impact === '高').length)

    // render helpers (keep inside component to access state/handlers)
    const renderMaterialsSection = () => {
        return (
            <div style={{ background: tokens.cardBg, padding: 14, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>案件资料</div>
                <div style={{ color: tokens.muted }}>
                    {loadingMaterials ? (
                        <div style={{ color: tokens.muted }}>加载中…</div>
                    ) : materials && materials.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {materials.map((m: any, i: number) => {
                                const filename = m.title || m.name || (m.storage_uri ? m.storage_uri.split('/').pop() : '未知文件')
                                const filetype = m.material_type || m.type || (m.storage_uri ? (m.storage_uri.split('.').pop() || '-') : '-')
                                const size = m.size || m.file_size || '-'
                                const time = m.created_at || m.updated_at || null
                                return (
                                    <li key={m.material_id ?? i} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{filename}</div>
                                                <div style={{ color: '#6b7280', fontSize: 13 }}>{filetype} • {typeof size === 'number' ? `${(size / 1024).toFixed(1)} KB` : size} • {time ? new Date(time).toLocaleString() : '-'}</div>
                                            </div>
                                            <div>
                                                <button
                                                    onClick={async () => {
                                                        setConversionError(null)
                                                        if (!m || !m.material_id) return
                                                        setConvertingMaterialId(m.material_id)
                                                        try {
                                                            const base = (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:4000'
                                                            const url = `${base}/matters/${encodeURIComponent(matterId)}/evidence`
                                                            const body = {
                                                                material_id: m.material_id,
                                                                title: m.title || (m.storage_uri ? m.storage_uri.split('/').pop() : '未命名文件'),
                                                                evidence_type: 'material',
                                                            }
                                                            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                                                            if (!res.ok) throw new Error(`status:${res.status}`)
                                                            // refresh data locally
                                                            try { await fetchEvidence() } catch (err) { }
                                                            try { await fetchMaterials() } catch (err) { }
                                                        } catch (e) {
                                                            console.error('convert failed', e)
                                                            setConversionError('转为证据失败，请稍后重试')
                                                        } finally {
                                                            setConvertingMaterialId(null)
                                                        }
                                                    }}
                                                    disabled={convertingMaterialId === m.material_id}
                                                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e6e7eb', background: '#fff', color: '#111827', cursor: convertingMaterialId === m.material_id ? 'not-allowed' : 'pointer' }}
                                                >
                                                    {convertingMaterialId === m.material_id ? '转换中…' : '转为证据'}
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    ) : (
                        <div style={{ color: tokens.muted }}>暂无案件资料</div>
                    )}
                    {conversionError ? <div style={{ color: '#b91c1c', marginTop: 8 }}>{conversionError}</div> : null}
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        {materialsConfirmed ? (
                            <div style={{ color: '#111827', border: '1px solid #f1f5f9', padding: '8px 12px', borderRadius: 8 }}>已确认资料接收完成</div>
                        ) : (
                            <button onClick={() => setMaterialsConfirmed(true)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e7eb', background: '#fff', color: '#111827', fontWeight: 700 }}>资料接收完成</button>
                        )}

                        {materialsConfirmed ? (
                            <div style={{ width: '100%', maxWidth: 720, background: '#fff', border: '1px solid #e6e7eb', padding: 14, borderRadius: 8 }}>
                                <div style={{ fontWeight: 800, marginBottom: 6 }}>下一步：证据整理</div>
                                <div style={{ color: tokens.muted, marginBottom: 10 }}>将已接收资料进入证据整理阶段</div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button onClick={() => setShowOrganizeNotice(true)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e7eb', background: '#fff', color: '#111827', fontWeight: 700 }}>开始证据整理</button>
                                    {showOrganizeNotice ? <div style={{ color: '#6b7280' }}>证据整理功能将在下一步接入</div> : null}
                                </div>
                            </div>
                        ) : null}

                        <div style={{ color: tokens.muted, fontSize: 12 }}>证据对象</div>

                        <div style={{ padding: 8, borderRadius: 8, background: '#fff8ed', flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#b45309' }}>{highGapCount}</div>
                            <div style={{ color: tokens.muted, fontSize: 12 }}>高风险缺口</div>
                        </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <div style={{ fontWeight: 700 }}>阻塞点</div>
                        <div style={{ color: tokens.muted, marginTop: 6 }}>{((data as any)?.missing_evidence && (data as any).missing_evidence[0]?.title) || (selectedAiSummary && ((selectedAiSummary as any).risks || [])[0]) || '无'}</div>

                        <div style={{ fontWeight: 700, marginTop: 8 }}>建议下一步</div>
                        <div style={{ color: tokens.muted, marginTop: 6 }}>{((data as any)?.evidence_next_steps && (data as any).evidence_next_steps[0]?.title) || (selectedAiSummary && ((selectedAiSummary as any).recommendations || [])[0]) || '请律师补强证据'}</div>
                    </div>
                </div>
            </div>
        )
    }

    const renderEvidenceRecordsSection = () => {
        return (
            <div style={{ background: tokens.cardBg, padding: 14, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                <div style={{ fontWeight: 800 }}>Evidence Tree</div>
                <div style={{ color: tokens.muted, marginTop: 6 }}>证据对象（非文件）按证明目标组织</div>
                <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 700 }}>{(data as any)?.proofGoal ?? fallbackWorkspace.proofGoal}</div>
                    <div style={{ marginTop: 8 }}>
                        {(data as any)?.evidences?.map((e: any, idx: number) => (
                            <div key={e.id} style={{ padding: 8, borderRadius: 8, marginBottom: 8, background: selectedEvidenceId === e.id ? '#eef6ff' : '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ cursor: 'pointer' }} onClick={() => setSelectedEvidenceId(e.id)}>
                                        <div style={{ fontSize: 12, color: tokens.muted, marginBottom: 4 }}>证据 {idx + 1}</div>
                                        <div style={{ fontWeight: 700, color: selectedEvidenceId === e.id ? tokens.blue : tokens.text }}>{e.title}</div>
                                        <div style={{ color: tokens.muted, fontSize: 12 }}>{e.date}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: tokens.muted, fontSize: 13 }}>{e.type} • 强度 {e.strength}%</div>
                                    </div>
                                </div>

                                <div style={{ marginTop: 8 }}>
                                    {/* status display & selector */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        {(() => {
                                            const rec = evidenceRecords && evidenceRecords.find((r: any) => String(r.evidence_id) === String(e.id))
                                            const currentStatus = rec && typeof rec.status === 'string' ? rec.status : 'active'
                                            const statusLabels: Record<string, string> = {
                                                active: '待处理',
                                                pending: '待核验',
                                                accepted: '已采用',
                                                weak: '证据较弱',
                                                rejected: '暂不采用',
                                            }
                                            const allowed = ['active', 'pending', 'accepted', 'weak', 'rejected']
                                            return (
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <div style={{ color: tokens.muted, fontSize: 13 }}>状态：</div>
                                                    <select
                                                        value={currentStatus}
                                                        disabled={Boolean(updatingStatusId)}
                                                        onChange={async (ev) => {
                                                            const newStatus = ev.target.value
                                                            setStatusErrorById((s) => ({ ...s, [e.id]: '' }))
                                                            setUpdatingStatusId(e.id)
                                                            try {
                                                                const base = (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:4000'
                                                                const url = `${base}/matters/${encodeURIComponent(matterId)}/evidence/${encodeURIComponent(e.id)}/status`
                                                                const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
                                                                if (!res.ok) throw new Error(`status:${res.status}`)
                                                                // refresh evidence list
                                                                try { await fetchEvidence() } catch (err) { }
                                                            } catch (err) {
                                                                console.error('update status failed', err)
                                                                setStatusErrorById((s) => ({ ...s, [e.id]: '更新证据状态失败，请稍后重试' }))
                                                            } finally {
                                                                setUpdatingStatusId(null)
                                                            }
                                                        }}
                                                        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e6e7eb', background: '#fff', color: '#111827' }}
                                                    >
                                                        {allowed.map((k) => (
                                                            <option key={k} value={k}>{statusLabels[k] || k}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                    {editingEvidenceId === e.id ? (
                                        <div>
                                            <textarea value={editingDescription} onChange={(ev) => setEditingDescription(ev.target.value)} style={{ width: '100%', minHeight: 80, padding: 8, borderRadius: 6, border: '1px solid #e6e7eb', resize: 'vertical' }} />
                                            <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button onClick={() => { setEditingEvidenceId(null); setEditingDescription(''); setSaveDescriptionError(null) }} style={{ padding: '6px 10px', borderRadius: 6, background: '#fff', border: '1px solid #e6e7eb' }}>取消</button>
                                                <button disabled={savingDescription} onClick={async () => {
                                                    setSaveDescriptionError(null)
                                                    setSavingDescription(true)
                                                    try {
                                                        const base = (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:4000'
                                                        const url = `${base}/matters/${encodeURIComponent(matterId)}/evidence/${encodeURIComponent(e.id)}`
                                                        const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: editingDescription }) })
                                                        if (!res.ok) throw new Error(`status:${res.status}`)
                                                        // refresh evidence list and exit edit mode
                                                        try { await fetchEvidence() } catch (err) { }
                                                        setEditingEvidenceId(null)
                                                        setEditingDescription('')
                                                    } catch (err) {
                                                        console.error('save description failed', err)
                                                        setSaveDescriptionError('保存备注失败，请稍后重试')
                                                    } finally {
                                                        setSavingDescription(false)
                                                    }
                                                }} style={{ padding: '6px 10px', borderRadius: 6, background: '#111827', color: '#fff', border: 'none' }}>{savingDescription ? '保存中…' : '保存备注'}</button>
                                            </div>
                                            {saveDescriptionError ? <div style={{ color: '#b91c1c', marginTop: 6 }}>{saveDescriptionError}</div> : null}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ color: tokens.muted }}>{e.notes && String(e.notes).trim().length > 0 ? e.notes : '暂无备注'}</div>
                                            <div>
                                                <button onClick={() => { setEditingEvidenceId(e.id); setEditingDescription(e.notes || '') }} style={{ padding: '6px 10px', borderRadius: 6, background: '#fff', border: '1px solid #e6e7eb' }}>编辑备注</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <main style={{ minHeight: '80vh', padding: 20, background: tokens.pageBg, fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                    <h2 style={{ margin: 0 }}>证据工作区</h2>
                    <div style={{ color: tokens.muted, marginTop: 6 }}>基于证明目标组织证据</div>
                </div>

                <div>
                    <button onClick={() => alert('上传证据')} style={{ padding: '8px 12px', borderRadius: 8, background: tokens.blue, color: '#fff', border: 'none' }}>上传证据</button>
                </div>
            </header>

            {/* 案件资料列表（来自 materials） */}
            <section style={{ marginBottom: 12 }}>
                {renderMaterialsSection()}
                {renderEvidenceRecordsSection()}

                {/* Proof Map */}
                <div style={{ background: tokens.cardBg, padding: 14, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                    <div style={{ fontWeight: 800 }}>Proof Map</div>
                    <div style={{ color: tokens.muted, marginTop: 6 }}>关系示意</div>
                    <div style={{ marginTop: 12, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="100%" height="120" viewBox="0 0 400 120">
                            {/* nodes */}
                            <circle cx="60" cy="60" r="28" fill="#eef2ff" stroke="#c7ddff" />
                            <text x="60" y="65" fontSize="12" textAnchor="middle" fill="#1e293b">{(data as any)?.proofMap?.nodes?.[0]?.label ?? '借款合意'}</text>
                            <circle cx="200" cy="60" r="28" fill="#eef2ff" stroke="#c7ddff" />
                            <text x="200" y="65" fontSize="12" textAnchor="middle" fill="#1e293b">{(data as any)?.proofMap?.nodes?.[1]?.label ?? '资金交付'}</text>
                            <circle cx="340" cy="60" r="28" fill="#eef2ff" stroke="#c7ddff" />
                            <text x="340" y="65" fontSize="12" textAnchor="middle" fill="#1e293b">{(data as any)?.proofMap?.nodes?.[2]?.label ?? '未归还'}</text>
                            {/* links */}
                            <line x1="88" y1="60" x2="172" y2="60" stroke="#c7ddff" strokeWidth="2" />
                            <line x1="228" y1="60" x2="312" y2="60" stroke="#c7ddff" strokeWidth="2" />
                        </svg>
                    </div>
                </div>
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {/* Evidence Gap */}
                <div style={{ background: tokens.cardBg, padding: 14, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                    <div style={{ fontWeight: 800 }}>Evidence Gap</div>
                    <div style={{ color: tokens.muted, marginTop: 6 }}>缺失证据与影响评估</div>
                    <div style={{ marginTop: 10 }}>
                        {(data as any)?.gaps?.length > 0 ? (data as any).gaps.map((g: any) => (
                            <div key={g.id} style={{ padding: 10, borderRadius: 8, marginBottom: 8, background: '#fff', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ fontWeight: 700 }}>{g.title}</div>
                                    <div style={{ color: (String(g.impact || '').toLowerCase() === '高' || String(g.impact || '').toLowerCase() === 'high') ? '#b91c1c' : '#d97706' }}>{g.impact}</div>
                                </div>
                                <div style={{ color: tokens.muted, marginTop: 6 }}>建议：联系客户补充或寻求替代证据。</div>
                            </div>
                        )) : fallbackWorkspace.gaps.map((g: any) => (
                            <div key={g.id} style={{ padding: 10, borderRadius: 8, marginBottom: 8, background: '#fff', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ fontWeight: 700 }}>{g.title}</div>
                                    <div style={{ color: g.impact === '高' ? '#b91c1c' : '#d97706' }}>{g.impact}</div>
                                </div>
                                <div style={{ color: tokens.muted, marginTop: 6 }}>建议：联系客户补充或寻求替代证据。</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Discovery */}
                <div style={{ background: tokens.cardBg, padding: 14, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                    <div style={{ fontWeight: 800 }}>AI Discovery</div>
                    <div style={{ color: tokens.muted, marginTop: 6 }}>AI 自动发现</div>
                    <div style={{ marginTop: 10 }}>
                        {((data as any)?.discoveries || fallbackWorkspace.discoveries).map((d: any) => (
                            <div key={d.id || d.text} style={{ padding: 10, borderRadius: 8, marginBottom: 8, background: '#fff', border: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: 14 }}>{d.text || String(d)}</div>
                                {d.confidence ? <div style={{ marginTop: 6, color: tokens.muted, fontSize: 12 }}>可信度：{Math.round((d.confidence || 0) * 100)}%</div> : null}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Evidence Timeline */}
                <div style={{ background: tokens.cardBg, padding: 14, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                    <div style={{ fontWeight: 800 }}>Evidence Timeline</div>
                    <div style={{ color: tokens.muted, marginTop: 6 }}>按时间排列关键证据事件</div>
                    <div style={{ marginTop: 10 }}>
                        {((data as any)?.timeline || fallbackWorkspace.timeline).map((t: any) => (
                            <div key={t.id || t.time || t.text} style={{ padding: 8, borderBottom: '1px dashed #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ fontWeight: 700 }}>{t.text}</div>
                                    <div style={{ color: tokens.muted }}>{t.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Evidence Details + Score footer */}
            <section style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
                <div style={{ background: tokens.cardBg, padding: 14, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                    <div style={{ fontWeight: 800 }}>证据详情</div>
                    <div style={{ color: tokens.muted, marginTop: 6 }}>{selectedEvidence.title} • {selectedEvidence.type}</div>
                    <div style={{ marginTop: 10 }}>
                        <div style={{ fontWeight: 700 }}>说明</div>
                        <div style={{ marginTop: 6, color: tokens.muted }}>{selectedEvidence.notes}</div>
                        <div style={{ marginTop: 10, display: 'flex', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, color: tokens.muted }}>强度</div>
                                <div style={{ marginTop: 6 }}><ProgressBar value={selectedEvidence.strength} /></div>
                            </div>
                            <div style={{ width: 120 }}>
                                <div style={{ fontSize: 12, color: tokens.muted }}>日期</div>
                                <div style={{ marginTop: 6 }}>{selectedEvidence.date}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ background: tokens.cardBg, padding: 14, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                    <div style={{ fontWeight: 800 }}>Evidence Score</div>
                    <div style={{ color: tokens.muted, marginTop: 6 }}>综合分析</div>
                    <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>{selectedAiSummary && typeof selectedAiSummary.score === 'number' ? selectedAiSummary.score : globalScore}%</div>
                        <div style={{ marginTop: 8 }}><ProgressBar value={selectedAiSummary && typeof selectedAiSummary.score === 'number' ? selectedAiSummary.score : globalScore} /></div>
                        <div style={{ marginTop: 10, color: tokens.muted }}>说明：分数基于证据完整度、可靠性与可验证性。</div>
                    </div>
                </div>
            </section>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => router.push(`/matters/${matterId}`)} style={{ padding: '8px 12px', borderRadius: 8, background: '#f1f5f9', border: 'none', color: tokens.text }}>返回案件</button>
                <button onClick={() => alert('已保存')} style={{ padding: '8px 12px', borderRadius: 8, background: tokens.blue, border: 'none', color: '#fff' }}>保存</button>
            </div>
        </main >
    )
}
