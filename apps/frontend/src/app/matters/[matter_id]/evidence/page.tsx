"use client"
import React from 'react'
import { useState, useEffect, useMemo, useRef } from 'react'
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

const EMPTY_WORKSPACE = {
    proofGoal: '',
    evidences: [],
    proofMap: { nodes: [], links: [] },
    gaps: [],
    discoveries: [],
    timeline: [],
    score: null,
}

type EvidenceDraft = {
    draft_id: string
    matter_id: string
    material_id: string
    source_material_ids?: string[]
    materials?: Array<{ material_id?: string; title?: string }>
    title: string
    evidence_type?: string
    proof_purpose: string
    confidence?: number
    source?: string
    material_title?: string
    summary?: string
    reasoning?: string
    status: 'evidence_draft_ready' | 'editing' | 'confirmed' | 'ignored'
}

function isRecord(value: unknown): value is Record<string, any> { return Boolean(value && typeof value === 'object' && !Array.isArray(value)) }
function isNonEmptyString(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0 }
function isOptionalString(value: unknown) { return value === undefined || value === null || typeof value === 'string' }
function isOptionalFiniteNumber(value: unknown) { return value === undefined || value === null || (typeof value === 'number' && Number.isFinite(value)) }
function isProofText(value: unknown) { return typeof value === 'string' || Boolean(isRecord(value) && (isNonEmptyString(value.title) || isNonEmptyString(value.description)) && isOptionalString(value.title) && isOptionalString(value.description)) }
function isDisplayItem(value: unknown) { return typeof value === 'string' || (isRecord(value) && Object.values(value).every((field) => field === null || ['string', 'number', 'boolean'].includes(typeof field))) }
function isMaterial(value: any) { return Boolean(isRecord(value) && isNonEmptyString(value.material_id) && isNonEmptyString(value.title) && isOptionalString(value.material_type) && isOptionalString(value.source) && isOptionalString(value.storage_uri)) }
function isFormalEvidence(value: any) { return Boolean(isRecord(value) && isNonEmptyString(value.evidence_id) && isNonEmptyString(value.matter_id) && isNonEmptyString(value.title)) }
function isWorkspaceEvidence(value: unknown) { return Boolean(isRecord(value) && isNonEmptyString(value.evidence_id) && isNonEmptyString(value.title) && isOptionalString(value.evidence_type) && isOptionalString(value.status) && isOptionalString(value.relevance) && isOptionalString(value.description) && isOptionalString(value.material_id) && isOptionalString(value.source) && isOptionalString(value.updated_at) && isOptionalFiniteNumber(value.score) && isOptionalFiniteNumber(value.confidence)) }
function isSourceMaterial(value: unknown) { return Boolean(isRecord(value) && isNonEmptyString(value.material_id) && isNonEmptyString(value.title)) }
function isGraphNode(value: unknown) { return Boolean(isRecord(value) && (isNonEmptyString(value.id) || isNonEmptyString(value.node_id)) && (isNonEmptyString(value.label) || isNonEmptyString(value.title)) && isOptionalString(value.type)) }
function isGraphLink(value: unknown) { return Boolean(isRecord(value) && (isNonEmptyString(value.source) || isNonEmptyString(value.from)) && (isNonEmptyString(value.target) || isNonEmptyString(value.to)) && isOptionalString(value.id) && isOptionalString(value.label) && isOptionalString(value.type)) }
function isProofGraph(value: unknown) {
    if (!isRecord(value) || !Array.isArray(value.nodes) || !value.nodes.every(isGraphNode)) return false
    if (value.links !== undefined && (!Array.isArray(value.links) || !value.links.every(isGraphLink))) return false
    if (value.edges !== undefined && (!Array.isArray(value.edges) || !value.edges.every(isGraphLink))) return false
    return Array.isArray(value.links) || Array.isArray(value.edges)
}
function toProofMap(value: any) { return value ? { nodes: value.nodes, links: Array.isArray(value.links) ? value.links : value.edges } : EMPTY_WORKSPACE.proofMap }
function isNavigationItem(value: unknown) { return Boolean(isRecord(value) && isNonEmptyString(value.key) && isNonEmptyString(value.label) && typeof value.count === 'number' && Number.isFinite(value.count) && isOptionalString(value.description)) }
function isSuggestionItem(value: unknown) { return Boolean(isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.title) && isOptionalString(value.description) && isOptionalString(value.priority) && isOptionalString(value.reason) && isOptionalString(value.suggested_action) && isOptionalString(value.status)) }
function isTimelineItem(value: unknown) { return Boolean(isRecord(value) && (isNonEmptyString(value.id) || isNonEmptyString(value.text) || isNonEmptyString(value.title)) && isOptionalString(value.time) && isOptionalString(value.created_at) && isOptionalString(value.updated_at)) }
function isDiscoveryItem(value: unknown) { return typeof value === 'string' || Boolean(isRecord(value) && (isNonEmptyString(value.id) || isNonEmptyString(value.text) || isNonEmptyString(value.title)) && isOptionalFiniteNumber(value.confidence)) }
function isAiAnalysis(value: unknown) { return typeof value === 'string' || Boolean(isRecord(value) && isNonEmptyString(value.status) && isOptionalString(value.message) && (value.discoveries === undefined || (Array.isArray(value.discoveries) && value.discoveries.every(isDiscoveryItem))) && (value.risks === undefined || (Array.isArray(value.risks) && value.risks.every(isDisplayItem))) && (value.strengths === undefined || (Array.isArray(value.strengths) && value.strengths.every(isDisplayItem))) && (value.recommendations === undefined || (Array.isArray(value.recommendations) && value.recommendations.every(isDisplayItem))) && isOptionalFiniteNumber(value.score) && isOptionalFiniteNumber(value.confidence)) }
function isAiSummary(value: unknown) { return Boolean(isRecord(value) && isNonEmptyString(value.status) && isOptionalFiniteNumber(value.score) && isOptionalString(value.completeness) && (value.strengths === undefined || (Array.isArray(value.strengths) && value.strengths.every(isDisplayItem))) && (value.risks === undefined || (Array.isArray(value.risks) && value.risks.every(isDisplayItem))) && (value.recommendations === undefined || (Array.isArray(value.recommendations) && value.recommendations.every(isDisplayItem)))) }
function isSelectedEvidence(value: unknown) { return value === null || Boolean(isRecord(value) && isNonEmptyString(value.evidence_id) && isNonEmptyString(value.title) && isOptionalString(value.evidence_type) && isOptionalString(value.status) && isOptionalString(value.relevance) && isOptionalString(value.description) && isOptionalString(value.source) && isOptionalString(value.updated_at) && (value.related_material === null || value.related_material === undefined || isSourceMaterial(value.related_material)) && (value.related_documents === undefined || (Array.isArray(value.related_documents) && value.related_documents.every(isDisplayItem))) && (value.related_timeline === undefined || (Array.isArray(value.related_timeline) && value.related_timeline.every(isTimelineItem))) && (value.ai_summary === undefined || isAiSummary(value.ai_summary))) }

function isRawEvidenceDraft(value: unknown) {
    return Boolean(isRecord(value) && isNonEmptyString(value.draft_id) && isNonEmptyString(value.material_id) && isNonEmptyString(value.title) && isNonEmptyString(value.evidence_type) && isNonEmptyString(value.proof_purpose) && Array.isArray(value.source_material_ids) && value.source_material_ids.length > 0 && value.source_material_ids.every(isNonEmptyString) && Array.isArray(value.materials) && value.materials.length > 0 && value.materials.every(isSourceMaterial) && typeof value.summary === 'string' && typeof value.reasoning === 'string' && typeof value.confidence === 'number' && Number.isFinite(value.confidence) && ['client', 'opponent', 'court', 'third_party'].includes(value.source) && value.suggested_action === 'confirm_as_evidence')
}

function isEvidenceDraftEnvelope(value: unknown, currentMatterId: string) {
    return Boolean(isRecord(value) && value.status === 'evidence_draft_ready' && value.matter_id === currentMatterId && Array.isArray(value.evidence_drafts) && value.evidence_drafts.every(isRawEvidenceDraft))
}

function isEvidenceWorkspace(value: unknown, currentMatterId: string) {
    if (!isRecord(value)) return false
    if (value.matter_id !== undefined && (typeof value.matter_id !== 'string' || value.matter_id !== currentMatterId)) return false
    if (!isRecord(value.matter) || value.matter.matter_id !== currentMatterId || !isNonEmptyString(value.matter.title) || !isNonEmptyString(value.matter.status)) return false
    if (!isRecord(value.summary) || !['total', 'accepted', 'pending', 'weak', 'missing'].every((key) => typeof value.summary[key] === 'number' && Number.isFinite(value.summary[key]))) return false
    if (!Array.isArray(value.evidence_list) || !value.evidence_list.every(isWorkspaceEvidence)) return false
    if (!isRecord(value.navigation) || !['by_type', 'by_status', 'by_strength'].every((key) => Array.isArray(value.navigation[key]) && value.navigation[key].every(isNavigationItem))) return false
    if (!isSelectedEvidence(value.selected_evidence)) return false
    if (value.materials !== undefined && (!Array.isArray(value.materials) || !value.materials.every(isMaterial))) return false
    if (value.source_materials !== undefined && (!Array.isArray(value.source_materials) || !value.source_materials.every(isSourceMaterial))) return false
    if (value.proof_goal !== undefined && !isProofText(value.proof_goal)) return false
    if (value.proof_purpose !== undefined && !isProofText(value.proof_purpose)) return false
    for (const key of ['graph', 'proof_map', 'proof_graph']) if (value[key] !== undefined && !isProofGraph(value[key])) return false
    if (value.ai_analysis !== undefined && !isAiAnalysis(value.ai_analysis)) return false
    for (const key of ['risks', 'strengths', 'suggestions', 'next_actions']) if (value[key] !== undefined && (!Array.isArray(value[key]) || !value[key].every(isDisplayItem))) return false
    if (!Array.isArray(value.missing_evidence) || !value.missing_evidence.every(isSuggestionItem)) return false
    if (!Array.isArray(value.evidence_next_steps) || !value.evidence_next_steps.every(isSuggestionItem)) return false
    if (value.score !== undefined && !isOptionalFiniteNumber(value.score)) return false
    if (value.confidence !== undefined && !isOptionalFiniteNumber(value.confidence)) return false
    if (value.timeline !== undefined && (!Array.isArray(value.timeline) || !value.timeline.every(isTimelineItem))) return false
    if (value.discoveries !== undefined && (!Array.isArray(value.discoveries) || !value.discoveries.every(isDiscoveryItem))) return false
    return true
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
    const matterId = params?.matter_id || ''

    // minimal empty workspace
    const fallbackWorkspace = EMPTY_WORKSPACE

    const [data, setData] = useState<typeof EMPTY_WORKSPACE>(fallbackWorkspace)
    const [loading, setLoading] = useState<boolean>(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>('')
    const [materials, setMaterials] = useState<any[]>([])
    const [loadingMaterials, setLoadingMaterials] = useState<boolean>(true)
    const [materialsError, setMaterialsError] = useState<string | null>(null)
    const [materialsConfirmed, setMaterialsConfirmed] = useState<boolean>(false)
    const [showOrganizeNotice, setShowOrganizeNotice] = useState<boolean>(false)
    const [evidenceRecords, setEvidenceRecords] = useState<any[]>([])
    const [loadingEvidence, setLoadingEvidence] = useState<boolean>(true)
    const [evidencesError, setEvidencesError] = useState<string | null>(null)
    const convertedMaterialIds = useMemo(() => new Set((evidenceRecords || []).map((e: any) => e.material_id).filter(Boolean)), [evidenceRecords])
    const [convertingMaterialId, setConvertingMaterialId] = useState<string | null>(null)
    const [conversionError, setConversionError] = useState<string | null>(null)
    const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(null)
    const [editingDescription, setEditingDescription] = useState<string>('')
    const [savingDescription, setSavingDescription] = useState<boolean>(false)
    const [saveDescriptionError, setSaveDescriptionError] = useState<string | null>(null)
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
    const [statusErrorById, setStatusErrorById] = useState<Record<string, string>>({})
    const [reviewLoading, setReviewLoading] = useState<boolean>(false)
    const [reviewMessage, setReviewMessage] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState<number>(0)
    // AI suggestions state
    const [suggestions, setSuggestions] = useState<Array<{ title: string; reason: string; id?: string }>>([])
    const [analyzing, setAnalyzing] = useState<boolean>(false)
    const [evidenceDrafts, setEvidenceDrafts] = useState<EvidenceDraft[]>([])
    const [draftLoading, setDraftLoading] = useState<boolean>(false)
    const [draftError, setDraftError] = useState<string | null>(null)
    const [confirmingDraftId, setConfirmingDraftId] = useState<string | null>(null)
    const draftRequestKeyRef = useRef<string>('')

    // derive selected evidence from current data
    const selectedEvidence = (Array.isArray((data as any)?.evidences) ? (data as any).evidences.find((e: any) => e.id === selectedEvidenceId) : undefined) || (Array.isArray((data as any)?.evidences) && (data as any).evidences[0]) || null

    useEffect(() => {
        let cancelled = false
        async function load() {
            setLoading(true)
            setErrorMsg(null)
            const url = apiUrl(`/matters/${encodeURIComponent(matterId)}/evidence/workspace`)
            try {
                const res = await fetch(url)
                if (!res.ok) throw new Error(`status:${res.status}`)
                const json = await res.json().catch(() => { throw new Error('invalid_response') })
                if (!isEvidenceWorkspace(json, matterId)) throw new Error('invalid_response')

                const mapped = {
                    proofGoal: typeof json.proof_goal === 'string' ? json.proof_goal : (json.proof_goal?.title || json.proof_goal?.description || ''),
                    evidences: json.evidence_list.map((e: any) => ({
                        id: e.evidence_id,
                        title: e.title,
                        type: e.evidence_type || '',
                        date: e.updated_at || e.created_at || '',
                        strength: typeof e.score === 'number' && Number.isFinite(e.score) ? e.score : null,
                        notes: e.display_description || e.summary || e.proof_purpose || '',
                        proof_purpose: e.proof_purpose || e.relevance || '',
                        summary: e.summary || '',
                        reasoning: e.reasoning || '',
                        confidence: typeof e.confidence === 'number' ? e.confidence : null,
                        source_materials: Array.isArray(e.source_materials) ? e.source_materials : [],
                    })),
                    proofMap: toProofMap(json.graph || json.proof_map || json.proof_graph),
                    // missing_evidence / gaps
                    gaps: Array.isArray(json.missing_evidence) ? json.missing_evidence.map((g: any) => ({ id: g.id || g.key, title: g.title || g.description || '', description: g.description || '', impact: g.priority || g.impact || '' })) : [],
                    // ai discoveries
                    discoveries: json.ai_analysis?.status !== 'placeholder' && Array.isArray(json.ai_analysis?.discoveries) ? json.ai_analysis.discoveries : [],
                    // timeline: prefer explicit timeline, else derive from evidence_list
                    timeline: Array.isArray(json.timeline) ? json.timeline : (Array.isArray(json.selected_evidence?.related_timeline) ? json.selected_evidence.related_timeline : []),
                    score: json.summary && typeof json.summary.score === 'number' && Number.isFinite(json.summary.score) ? json.summary.score : null,
                    selected_evidence: json.selected_evidence ? {
                        id: json.selected_evidence.evidence_id || json.selected_evidence.id,
                        title: json.selected_evidence.title || json.selected_evidence.name || '',
                        type: json.selected_evidence.evidence_type || json.selected_evidence.type || '',
                        date: json.selected_evidence.updated_at || json.selected_evidence.created_at || '',
                        strength: json.selected_evidence.ai_summary && typeof json.selected_evidence.ai_summary.score === 'number' && Number.isFinite(json.selected_evidence.ai_summary.score) ? Number(json.selected_evidence.ai_summary.score) : null,
                        notes: json.selected_evidence.display_description || json.selected_evidence.summary || json.selected_evidence.proof_purpose || '',
                        proof_purpose: json.selected_evidence.proof_purpose || json.selected_evidence.relevance || '',
                        summary: json.selected_evidence.summary || '',
                        reasoning: json.selected_evidence.reasoning || '',
                        confidence: typeof json.selected_evidence.confidence === 'number' ? json.selected_evidence.confidence : null,
                        source_materials: Array.isArray(json.selected_evidence.source_materials) ? json.selected_evidence.source_materials : [],
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
                    setErrorMsg(err?.message === 'invalid_response' ? '证据工作区返回数据暂不可用' : '证据工作区加载失败，请稍后重试')
                    setLoading(false)
                }
            }
        }
        load()
        return () => { cancelled = true }
    }, [matterId, reloadKey])

    // fetch evidence records (GET /matters/:matter_id/evidence)
    async function fetchEvidence() {
        setLoadingEvidence(true)
        setEvidencesError(null)
        try {
            const url = apiUrl(`/matters/${encodeURIComponent(matterId)}/evidence`)
            const res = await fetch(url)
            if (!res.ok) throw new Error(`status:${res.status}`)
            const data = await res.json().catch(() => { throw new Error('invalid_response') })
            if (!Array.isArray(data) || !data.every(isFormalEvidence)) throw new Error('invalid_response')
            setEvidenceRecords(data)
            return data
        } catch (e) {
            console.error('load evidence failed', e)
            setEvidencesError((e as any)?.message === 'invalid_response' ? '证据返回数据暂不可用' : '正式证据加载失败，请稍后重试')
            return null
        } finally {
            setLoadingEvidence(false)
        }
    }

    // perform lawyer review action: 'approved' | 'revision'
    async function performReview(action: 'approved' | 'revision') {
        if (!selectedEvidence || !selectedEvidence.id) return
        setReviewMessage(null)
        setReviewLoading(true)
        try {
            const url = apiUrl(`/matters/${encodeURIComponent(matterId)}/evidence/${encodeURIComponent(selectedEvidence.id)}`)
            // ensure description is a string; prefer selectedEvidence.description, fall back to notes
            const description = String((selectedEvidence as any)?.description ?? (selectedEvidence as any)?.notes ?? '')
            const bodyPayload = { review: action, description }
            const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyPayload) })
            if (!res.ok) throw new Error(`status:${res.status}`)
            const json = await res.json().catch(() => { throw new Error('invalid_response') })
            if (!isFormalEvidence(json)) throw new Error('invalid_response')
            // refresh evidence data
            try { await fetchEvidence() } catch (e) { }
            // trigger workspace reload to refresh selected_evidence if backend provided it
            setReloadKey((k) => k + 1)

            if (action === 'approved') setReviewMessage('已审核通过')
            else setReviewMessage('已提交修改意见')

            // display task status in Chinese if returned
            if (json && typeof json.task_status === 'string') {
                const map: Record<string, string> = {
                    waiting_lawyer: '等待律师确认',
                    approved: '已通过',
                    revision_requested: '需要修改',
                    ai_revising: 'AI 修改中',
                    finalized: '已归档',
                    completed: '已完成',
                }
                const label = map[String(json.task_status)]
                if (label) setReviewMessage((m) => (m ? `${m} · 任务状态：${label}` : `任务状态：${label}`))
            }
        } catch (err) {
            console.error('review failed', err)
            setReviewMessage('审核操作失败，请重试')
        } finally {
            setReviewLoading(false)
            // clear message after short delay
            setTimeout(() => setReviewMessage(null), 4000)
        }
    }

    // fetch materials (GET /matters/:matter_id/materials)
    async function fetchMaterials() {
        setLoadingMaterials(true)
        setMaterialsError(null)
        try {
            const url = apiUrl(`/matters/${encodeURIComponent(matterId)}/materials`)
            const res = await fetch(url)
            if (!res.ok) throw new Error(`status:${res.status}`)
            const data = await res.json().catch(() => { throw new Error('invalid_response') })
            if (!Array.isArray(data) || !data.every(isMaterial)) throw new Error('invalid_response')
            setMaterials(data)
        } catch (e) {
            console.error('load materials failed', e)
            setMaterialsError((e as any)?.message === 'invalid_response' ? '材料返回数据暂不可用' : '案件材料加载失败，请稍后重试')
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

    useEffect(() => {
        if (!matterId || loadingMaterials || loadingEvidence || materialsError || evidencesError) return
        if (!materials || materials.length === 0) return
        if (evidenceRecords && evidenceRecords.length > 0) return
        if (evidenceDrafts.length > 0) return

        const draftRequestKey = `${matterId}:${materials.map((m: any) => String(m.material_id || '')).join('|')}`
        if (draftRequestKeyRef.current === draftRequestKey) return
        draftRequestKeyRef.current = draftRequestKey

        async function generateDrafts() {
            setDraftLoading(true)
            setDraftError(null)
            try {
                const res = await fetch(apiUrl('/intake/evidence-draft'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        matter_id: matterId,
                        materials: materials.map((m: any) => ({
                            material_id: m.material_id,
                            title: m.title || m.name || m.storage_uri || '未命名材料',
                            material_type: m.material_type || m.type || 'document',
                            source: m.source || 'client',
                        })),
                    }),
                })
                if (!res.ok) {
                    const errorPayload = await res.json().catch(() => null)
                    const safeError = isRecord(errorPayload) && typeof errorPayload.error === 'string' && /^[a-zA-Z0-9_ -]{1,80}$/.test(errorPayload.error) ? errorPayload.error : ''
                    throw new Error(`draft_http:${res.status}:${safeError}`)
                }
                const json = await res.json().catch(() => { throw new Error('draft_invalid_json') })
                if (!isEvidenceDraftEnvelope(json, matterId)) throw new Error('draft_invalid_response')
                const materialTitleById = new Map(materials.map((m: any) => [String(m.material_id), String(m.title || m.name || m.storage_uri || '未命名材料')]))
                const drafts = json.evidence_drafts
                setEvidenceDrafts(drafts.map((draft: any) => ({
                    draft_id: draft.draft_id,
                    matter_id: json.matter_id,
                    material_id: draft.material_id,
                    source_material_ids: Array.isArray(draft.source_material_ids)
                        ? draft.source_material_ids.map((id: unknown) => String(id)).filter(Boolean)
                        : (draft.material_id ? [String(draft.material_id)] : []),
                    materials: Array.isArray(draft.materials) ? draft.materials : [],
                    title: draft.title,
                    evidence_type: typeof draft.evidence_type === 'string' ? draft.evidence_type : undefined,
                    proof_purpose: draft.proof_purpose,
                    confidence: typeof draft.confidence === 'number' ? draft.confidence : undefined,
                    source: typeof draft.source === 'string' ? draft.source : undefined,
                    material_title: Array.isArray(draft.materials) && draft.materials.length > 0
                        ? draft.materials.map((m: any) => String(m.title || m.material_id || '')).filter(Boolean).join('、')
                        : materialTitleById.get(String(draft.material_id || draft.source_material_ids?.[0])) || String(draft.material_id || draft.source_material_ids?.[0] || ''),
                    summary: typeof draft.summary === 'string' ? draft.summary : undefined,
                    reasoning: typeof draft.reasoning === 'string' ? draft.reasoning : undefined,
                    status: json.status,
                })))
            } catch (err: any) {
                console.error('generate evidence drafts failed', err)
                draftRequestKeyRef.current = ''
                const code = String(err?.message || '')
                if (code === 'draft_invalid_json' || code === 'draft_invalid_response') setDraftError('证据返回数据暂不可用')
                else if (code.startsWith('draft_http:')) {
                    const [, status, safeError] = code.split(':')
                    setDraftError(`证据草稿接口返回错误（HTTP ${status}${safeError ? `：${safeError}` : ''}）`)
                }
                else setDraftError('证据草稿生成失败，请稍后重试')
            } finally {
                setDraftLoading(false)
            }
        }
        generateDrafts()
        return () => {
            if (draftRequestKeyRef.current === draftRequestKey) {
                draftRequestKeyRef.current = ''
            }
        }
    }, [matterId, loadingMaterials, loadingEvidence, materialsError, evidencesError, materials, evidenceRecords, evidenceDrafts.length])

    // reconcile selectedEvidenceId when data.evidences change
    useEffect(() => {
        const evidences = (data as any)?.evidences || []
        if (!Array.isArray(evidences) || evidences.length === 0) return
        const exists = evidences.some((e: any) => e.id === selectedEvidenceId)
        if (!exists) {
            setSelectedEvidenceId(evidences[0].id)
        }
    }, [(data as any)?.evidences, selectedEvidenceId])

    // render
    const selectedAiSummary = (selectedEvidence as any)?.ai_summary ?? (data as any)?.selected_evidence?.ai_summary ?? null
    const globalScore = typeof (data as any)?.score === 'number' ? (data as any).score : null
    const proofNodes = Array.isArray((data as any)?.proofMap?.nodes) ? (data as any).proofMap.nodes : []
    const proofLinks = Array.isArray((data as any)?.proofMap?.links) ? (data as any).proofMap.links : []
    const evidencesCount = Array.isArray((data as any)?.evidences) ? (data as any).evidences.length : fallbackWorkspace.evidences.length
    const highGapCount = Array.isArray((data as any)?.gaps) ? ((data as any).gaps.filter((g: any) => String(g.impact || '').toLowerCase() === '高' || String(g.impact || '').toLowerCase() === 'high').length) : (fallbackWorkspace.gaps.filter((g: any) => g.impact === '高').length)
    const hasSelectedEvidence = !!selectedEvidence && typeof selectedEvidence === 'object'
    const selectedScore = typeof selectedEvidence?.strength === 'number'
        ? selectedEvidence.strength
        : (selectedAiSummary && typeof selectedAiSummary.score === 'number' ? selectedAiSummary.score : globalScore)
    const hasUnreviewedDrafts = evidenceDrafts.some((draft) => draft.status === 'evidence_draft_ready' || draft.status === 'editing')
    const canContinueAi = !hasUnreviewedDrafts && !draftLoading

    function updateDraft(draftId: string, patch: Partial<EvidenceDraft>) {
        setEvidenceDrafts((prev) => prev.map((draft) => draft.draft_id === draftId ? { ...draft, ...patch } : draft))
    }

    async function acceptDraft(draft: EvidenceDraft) {
        if (!draft.material_id || confirmingDraftId) return
        setConfirmingDraftId(draft.draft_id)
        setDraftError(null)
        try {
            const res = await fetch(apiUrl('/intake/confirm-evidence'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matter_id: matterId,
                    evidence_drafts: [{
                        draft_id: draft.draft_id,
                        material_id: draft.material_id,
                        source_material_ids: draft.source_material_ids && draft.source_material_ids.length > 0 ? draft.source_material_ids : [draft.material_id],
                        materials: draft.materials && draft.materials.length > 0 ? draft.materials : [{ material_id: draft.material_id, title: draft.material_title }],
                        title: draft.title,
                        evidence_type: draft.evidence_type || 'document',
                        proof_purpose: draft.proof_purpose,
                        description: draft.summary || draft.reasoning || draft.proof_purpose,
                        relevance: draft.proof_purpose,
                        summary: draft.summary || '',
                        reasoning: draft.reasoning || '',
                        confidence: draft.confidence,
                        source: draft.source || 'client',
                    }],
                    idempotency_key: `evidence-draft-${matterId}-${draft.draft_id}`,
                }),
            })
            if (!res.ok) throw new Error(`status:${res.status}`)
            const result = await res.json().catch(() => { throw new Error('invalid_response') })
            if (!result || typeof result !== 'object' || result.status !== 'evidence_created' || result.matter_id !== matterId || !Array.isArray(result.created_evidence) || !result.created_evidence.every(isFormalEvidence)) throw new Error('invalid_response')
            updateDraft(draft.draft_id, { status: 'confirmed' })
            await fetchEvidence()
            setReloadKey((key) => key + 1)
        } catch (err: any) {
            console.error('confirm evidence draft failed', err)
            setDraftError(err?.message === 'invalid_response' ? '证据返回数据暂不可用' : '证据草稿确认失败，请稍后重试')
        } finally {
            setConfirmingDraftId(null)
        }
    }

    // render helpers (keep inside component to access state/handlers)
    const renderMaterialsSection = () => {
        return (
            <div style={{ background: tokens.cardBg, padding: 14, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>案件资料</div>
                <div style={{ color: tokens.muted }}>
                    {loadingMaterials ? (
                        <div style={{ color: tokens.muted }}>加载中…</div>
                    ) : materialsError ? (
                        <div>
                            <div style={{ color: '#b91c1c' }}>{materialsError}</div>
                            <button onClick={() => void fetchMaterials()} style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, background: '#fff', border: '1px solid #e6e7eb' }}>重新加载</button>
                        </div>
                    ) : materials && materials.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {materials.map((m: any, i: number) => {
                                const filename = m.title || m.name || (m.storage_uri ? m.storage_uri.split('/').pop() : '未知文件')
                                const filetype = m.material_type || m.type || (m.storage_uri ? (m.storage_uri.split('.').pop() || '-') : '-')
                                const size = m.size || m.file_size || '-'
                                const time = m.created_at || m.updated_at || null
                                return (
                                    <li className="ld-list-item" key={m.material_id ?? i} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{filename}</div>
                                                <div style={{ color: '#6b7280', fontSize: 13 }}>{filetype} • {typeof size === 'number' ? `${(size / 1024).toFixed(1)} KB` : size} • {time ? new Date(time).toLocaleString() : '-'}</div>
                                            </div>
                                            <div style={{ color: tokens.muted, fontSize: 13 }}>等待 AI 草稿审核</div>
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
                                <div style={{ color: tokens.muted }}>系统将基于已上传材料生成 Evidence Draft，律师审核后写入正式 Evidence。</div>
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
                        <div style={{ color: tokens.muted, marginTop: 6 }}>{((data as any)?.missing_evidence && (data as any).missing_evidence[0]?.title) || (selectedAiSummary && ((selectedAiSummary as any).risks || [])[0]) || '暂无风险与建议'}</div>

                        <div style={{ fontWeight: 700, marginTop: 8 }}>建议下一步</div>
                        <div style={{ color: tokens.muted, marginTop: 6 }}>{((data as any)?.evidence_next_steps && (data as any).evidence_next_steps[0]?.title) || (selectedAiSummary && ((selectedAiSummary as any).recommendations || [])[0]) || '暂无证据工作建议'}</div>
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
                {loadingEvidence ? <div style={{ color: tokens.muted, marginTop: 10 }}>正式证据加载中…</div> : null}
                {!loadingEvidence && evidencesError ? (
                    <div style={{ marginTop: 10 }}>
                        <div style={{ color: '#b91c1c' }}>{evidencesError}</div>
                        <button onClick={() => void fetchEvidence()} style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, background: '#fff', border: '1px solid #e6e7eb' }}>重新加载</button>
                    </div>
                ) : null}
                {!loadingEvidence && !evidencesError && evidenceRecords.length === 0 ? <div style={{ color: tokens.muted, marginTop: 10 }}>暂无正式证据</div> : null}
                <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 700 }}>{(data as any)?.proofGoal || '暂无证明目标'}</div>
                    <div style={{ marginTop: 8 }}>
                        {(data as any)?.evidences?.map((e: any, idx: number) => (
                            <div className="ld-review-card" key={e.id} style={{ padding: 8, borderRadius: 8, marginBottom: 8, background: selectedEvidenceId === e.id ? '#eef6ff' : '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ cursor: 'pointer' }} onClick={() => setSelectedEvidenceId(e.id)}>
                                        <div style={{ fontSize: 12, color: tokens.muted, marginBottom: 4 }}>证据 {idx + 1}</div>
                                        <div style={{ fontWeight: 700, color: selectedEvidenceId === e.id ? tokens.blue : tokens.text }}>{e.title}</div>
                                        {e.proof_purpose ? <div style={{ color: tokens.muted, fontSize: 12, marginTop: 4 }}>证明目标：{e.proof_purpose}</div> : null}
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
                                                                const url = apiUrl(`/matters/${encodeURIComponent(matterId)}/evidence/${encodeURIComponent(e.id)}/status`)
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
                                                        const url = apiUrl(`/matters/${encodeURIComponent(matterId)}/evidence/${encodeURIComponent(e.id)}`)
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
                                            <div style={{ color: tokens.muted }}>{e.notes && String(e.notes).trim().length > 0 ? e.notes : '暂无证据摘要'}</div>
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

    const renderEvidenceDraftsSection = () => {
        if (materials.length === 0) return null
        if (evidenceRecords.length > 0 && !hasUnreviewedDrafts) return null

        return (
            <div style={{ background: tokens.cardBg, padding: 14, borderRadius: tokens.radius, border: `1px solid ${tokens.border}`, marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                        <div style={{ fontWeight: 800 }}>Evidence Draft</div>
                        <div style={{ color: tokens.muted, marginTop: 6 }}>AI 已根据当前案件资料生成证据草稿，请律师审核。</div>
                    </div>
                    {draftLoading ? <div style={{ color: tokens.muted }}>正在生成草稿…</div> : null}
                </div>

                {draftError ? <div style={{ marginTop: 10, color: '#b91c1c' }}>{draftError}</div> : null}

                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                    {evidenceDrafts.length > 0 ? evidenceDrafts.map((draft) => {
                        const disabled = draft.status === 'confirmed' || draft.status === 'ignored'
                        return (
                            <div className="ld-review-card" key={draft.draft_id} style={{ padding: 12, borderRadius: 8, border: '1px solid #f1f5f9', background: draft.status === 'ignored' ? '#f8fafc' : '#fff' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
                                    <div style={{ display: 'grid', gap: 8 }}>
                                        <label>
                                            <div style={{ fontSize: 12, color: tokens.muted }}>名称</div>
                                            {draft.status === 'editing' ? (
                                                <input value={draft.title} onChange={(e) => updateDraft(draft.draft_id, { title: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e6e7eb' }} />
                                            ) : (
                                                <div className="ld-review-card-title" style={{ fontWeight: 800 }}>{draft.title}</div>
                                            )}
                                        </label>
                                        <label>
                                            <div style={{ fontSize: 12, color: tokens.muted }}>证明目标</div>
                                            {draft.status === 'editing' ? (
                                                <textarea value={draft.proof_purpose} onChange={(e) => updateDraft(draft.draft_id, { proof_purpose: e.target.value })} style={{ width: '100%', minHeight: 64, padding: 8, borderRadius: 8, border: '1px solid #e6e7eb' }} />
                                            ) : (
                                                <div style={{ color: tokens.text }}>{draft.proof_purpose}</div>
                                            )}
                                        </label>
                                        <div className="ld-source-relation" style={{ color: tokens.muted, fontSize: 13 }}>来源材料：{draft.material_title || draft.material_id}</div>
                                        <div style={{ color: tokens.muted, fontSize: 13 }}>AI 摘要或判断理由：{draft.summary || draft.reasoning || draft.proof_purpose}</div>
                                        <div style={{ color: tokens.muted, fontSize: 13 }}>可信度：{typeof draft.confidence === 'number' ? `${Math.round(draft.confidence * 100)}%` : '待律师确认'}</div>
                                    </div>
                                    <div className="ld-review-actions" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                                        {draft.status === 'confirmed' ? <div style={{ color: '#047857', fontWeight: 700 }}>已确认</div> : null}
                                        {draft.status === 'ignored' ? <div style={{ color: tokens.muted, fontWeight: 700 }}>已忽略</div> : null}
                                        <button disabled={disabled || confirmingDraftId === draft.draft_id} onClick={() => acceptDraft(draft)} style={{ padding: '6px 10px', borderRadius: 6, background: disabled ? '#94a3b8' : '#111827', color: '#fff', border: 'none' }}>{confirmingDraftId === draft.draft_id ? '确认中…' : '接受'}</button>
                                        <button disabled={disabled} onClick={() => updateDraft(draft.draft_id, { status: draft.status === 'editing' ? 'evidence_draft_ready' : 'editing' })} style={{ padding: '6px 10px', borderRadius: 6, background: '#fff', color: '#111827', border: '1px solid #e6e7eb' }}>{draft.status === 'editing' ? '完成修改' : '修改'}</button>
                                        <button disabled={disabled} onClick={() => updateDraft(draft.draft_id, { status: 'ignored' })} style={{ padding: '6px 10px', borderRadius: 6, background: '#fff', color: '#111827', border: '1px solid #e6e7eb' }}>忽略</button>
                                    </div>
                                </div>
                            </div>
                        )
                    }) : (
                        <div style={{ color: tokens.muted }}>{draftLoading ? '正在读取案件资料并生成证据草稿。' : '暂无可审核的证据草稿。'}</div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <main className="lawdesk-workspace" style={{ minHeight: '80vh', padding: 20, background: tokens.pageBg, fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' }}>
            <div style={{ marginBottom: 12 }}>
                <button onClick={() => router.push(`/matters/${matterId}`)} style={{ background: 'transparent', border: 'none', color: tokens.muted, fontSize: 14, padding: 0, cursor: 'pointer' }}>← 返回案件概览</button>
            </div>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                    <h2 style={{ margin: 0 }}>证据工作区</h2>
                    <div style={{ color: tokens.muted, marginTop: 6 }}>基于证明目标组织证据</div>
                </div>

                <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button onClick={() => alert('上传证据')} style={{ padding: '8px 12px', borderRadius: 8, background: tokens.blue, color: '#fff', border: 'none' }}>上传证据</button>
                        <button disabled={analyzing || !canContinueAi} onClick={() => router.push(`/matters/${matterId}/facts`)} style={{ padding: '8px 12px', borderRadius: 8, background: canContinueAi ? '#111827' : '#94a3b8', color: '#fff', border: 'none', fontWeight: 700, cursor: canContinueAi ? 'pointer' : 'default' }}>AI 继续工作</button>
                    </div>
                </div>
            </header>

            {/* 案件资料列表（来自 materials） */}
            <section style={{ marginBottom: 12 }}>
                {renderMaterialsSection()}
                {renderEvidenceDraftsSection()}
                {renderEvidenceRecordsSection()}

                {/* Proof Map */}
                <div style={{ background: tokens.cardBg, padding: 14, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                    <div style={{ fontWeight: 800 }}>Proof Map</div>
                    <div style={{ color: tokens.muted, marginTop: 6 }}>关系示意</div>
                    {proofNodes.length === 0 && proofLinks.length === 0 ? (
                        <div style={{ marginTop: 12, color: tokens.muted }}>暂无证明体系数据</div>
                    ) : (
                        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                            {proofNodes.map((node: any, index: number) => <div key={node.id || index} style={{ padding: 8, background: '#fff', border: '1px solid #f1f5f9', borderRadius: 8 }}>{node.label || node.title}</div>)}
                            {proofLinks.map((link: any, index: number) => <div key={link.id || index} style={{ color: tokens.muted, fontSize: 13 }}>{link.label || `${link.source || ''} → ${link.target || ''}`}</div>)}
                        </div>
                    )}
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
                                {g.description ? <div style={{ color: tokens.muted, marginTop: 6 }}>{g.description}</div> : null}
                            </div>
                        )) : <div style={{ color: tokens.muted }}>暂无风险与建议</div>}
                    </div>
                </div>

                {/* AI Discovery */}
                <div style={{ background: tokens.cardBg, padding: 14, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                    <div style={{ fontWeight: 800 }}>AI Discovery</div>
                    <div style={{ color: tokens.muted, marginTop: 6 }}>AI 自动发现</div>
                    <div style={{ marginTop: 10 }}>
                        {(data as any)?.discoveries?.length > 0 ? (data as any).discoveries.map((d: any) => (
                            <div key={d.id || d.text} style={{ padding: 10, borderRadius: 8, marginBottom: 8, background: '#fff', border: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: 14 }}>{d.text || String(d)}</div>
                                {d.confidence ? <div style={{ marginTop: 6, color: tokens.muted, fontSize: 12 }}>可信度：{Math.round((d.confidence || 0) * 100)}%</div> : null}
                            </div>
                        )) : <div style={{ color: tokens.muted }}>暂无 AI 证据分析</div>}
                    </div>
                </div>

                {/* Evidence Timeline */}
                <div style={{ background: tokens.cardBg, padding: 14, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                    <div style={{ fontWeight: 800 }}>Evidence Timeline</div>
                    <div style={{ color: tokens.muted, marginTop: 6 }}>按时间排列关键证据事件</div>
                    <div style={{ marginTop: 10 }}>
                        {(data as any)?.timeline?.length > 0 ? (data as any).timeline.map((t: any) => (
                            <div key={t.id || t.time || t.text} style={{ padding: 8, borderBottom: '1px dashed #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ fontWeight: 700 }}>{t.text}</div>
                                    <div style={{ color: tokens.muted }}>{t.time}</div>
                                </div>
                            </div>
                        )) : <div style={{ color: tokens.muted }}>暂无证据时间线</div>}
                    </div>
                </div>
            </section>

            {/* Evidence Details + Score footer */}
            <section style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
                {!hasSelectedEvidence ? (
                    <div style={{ gridColumn: '1 / -1', background: tokens.cardBg, padding: 14, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                        <div style={{ fontWeight: 800 }}>证据详情</div>
                        <div style={{ color: tokens.muted, marginTop: 6 }}>暂无选中证据。请从左侧证据列表选择证据或先创建证据。</div>
                    </div>
                ) : (
                    <>
                        <div style={{ background: tokens.cardBg, padding: 14, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                            <div style={{ fontWeight: 800 }}>证据详情</div>
                            <div style={{ color: tokens.muted, marginTop: 6 }}>{selectedEvidence.title} • {selectedEvidence.type}</div>
                            <div style={{ marginTop: 10 }}>
                                <div style={{ fontWeight: 700 }}>证明目标</div>
                                <div style={{ marginTop: 6, color: tokens.muted }}>{selectedEvidence.proof_purpose || '暂无证明目标'}</div>
                                <div style={{ fontWeight: 700, marginTop: 10 }}>说明</div>
                                <div style={{ marginTop: 6, color: tokens.muted }}>{selectedEvidence.summary || selectedEvidence.notes || '暂无证据摘要'}</div>
                                {selectedEvidence.reasoning ? (
                                    <>
                                        <div style={{ fontWeight: 700, marginTop: 10 }}>AI 判断</div>
                                        <div style={{ marginTop: 6, color: tokens.muted }}>{selectedEvidence.reasoning}</div>
                                    </>
                                ) : null}
                                {Array.isArray(selectedEvidence.source_materials) && selectedEvidence.source_materials.length > 0 ? (
                                    <>
                                        <div style={{ fontWeight: 700, marginTop: 10 }}>来源材料</div>
                                        <div style={{ marginTop: 6, color: tokens.muted }}>{selectedEvidence.source_materials.map((m: any) => m.title || m.material_id).join('、')}</div>
                                    </>
                                ) : null}
                                <div style={{ marginTop: 10, display: 'flex', gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, color: tokens.muted }}>强度</div>
                                        <div style={{ marginTop: 6 }}>{typeof selectedEvidence.strength === 'number' ? <ProgressBar value={selectedEvidence.strength} /> : '—'}</div>
                                    </div>
                                    <div style={{ width: 120 }}>
                                        <div style={{ fontSize: 12, color: tokens.muted }}>可信度</div>
                                        <div style={{ marginTop: 6 }}>{typeof selectedEvidence.confidence === 'number' ? `${Math.round(selectedEvidence.confidence * 100)}%` : '-'}</div>
                                    </div>
                                    <div style={{ width: 120 }}>
                                        <div style={{ fontSize: 12, color: tokens.muted }}>日期</div>
                                        <div style={{ marginTop: 6 }}>{selectedEvidence.date}</div>
                                    </div>
                                </div>
                                {/* Review actions */}
                                <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                                    <div style={{ color: tokens.muted, fontSize: 13, marginRight: 'auto' }} />
                                    <button
                                        onClick={async () => {
                                            if (!hasSelectedEvidence || reviewLoading) return
                                            await performReview('approved')
                                        }}
                                        disabled={!hasSelectedEvidence || reviewLoading}
                                        style={{ padding: '8px 12px', borderRadius: 8, background: '#fff', border: '1px solid #e6e7eb', color: '#111827' }}
                                    >
                                        审核通过
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!hasSelectedEvidence || reviewLoading) return
                                            await performReview('revision')
                                        }}
                                        disabled={!hasSelectedEvidence || reviewLoading}
                                        style={{ padding: '8px 12px', borderRadius: 8, background: '#fff', border: '1px solid #e6e7eb', color: '#111827' }}
                                    >
                                        要求修改
                                    </button>
                                </div>
                                {reviewMessage ? <div style={{ marginTop: 8, color: reviewMessage === '审核操作失败，请重试' ? '#b91c1c' : '#111827' }}>{reviewMessage}</div> : null}
                            </div>
                        </div>

                        <div style={{ background: tokens.cardBg, padding: 14, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                            <div style={{ fontWeight: 800 }}>Evidence Score</div>
                            <div style={{ color: tokens.muted, marginTop: 6 }}>综合分析</div>
                            <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 22, fontWeight: 800 }}>{typeof selectedScore === 'number' ? `${selectedScore}%` : '—'}</div>
                                {typeof selectedScore === 'number' ? <div style={{ marginTop: 8 }}><ProgressBar value={selectedScore} /></div> : null}
                                <div style={{ marginTop: 10, color: tokens.muted }}>说明：分数基于证据完整度、可靠性与可验证性。</div>
                            </div>
                            {/* AI Suggestions box */}
                            <div style={{ marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 800 }}>AI 建议</div>
                                    {suggestions && suggestions.length > 0 ? (
                                        <div style={{ color: tokens.muted, fontSize: 13 }}>请在 Evidence Draft 中审核后确认</div>
                                    ) : null}
                                </div>

                                {suggestions && suggestions.length > 0 ? (
                                    <div style={{ marginTop: 10 }}>
                                        {suggestions.map((s) => (
                                            <div key={s.id} style={{ padding: 10, borderRadius: 8, marginBottom: 8, background: '#fff', border: '1px solid #f1f5f9' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700 }}>{s.title}</div>
                                                        <div style={{ color: tokens.muted, marginTop: 6 }}>{s.reason}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                                                        <button onClick={() => {
                                                            setSuggestions((prev) => prev.filter((x) => x.id !== s.id))
                                                        }} style={{ padding: '6px 10px', borderRadius: 6, background: '#fff', color: '#111827', border: '1px solid #e6e7eb' }}>移除</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ marginTop: 10, color: tokens.muted }}>证据草稿审核后，AI 将继续基于正式 Evidence 推进后续工作。</div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </section>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => router.push(`/matters/${matterId}`)} style={{ padding: '8px 12px', borderRadius: 8, background: '#f1f5f9', border: 'none', color: tokens.text }}>返回案件</button>
            </div>
            {!canContinueAi ? (
                <div style={{ marginTop: 12, textAlign: 'center', color: '#92400e' }}>请先完成证据草稿审核</div>
            ) : null}
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                <button disabled={!canContinueAi} onClick={() => router.push(`/matters/${matterId}/facts`)} style={{ width: 720, maxWidth: '90%', padding: '12px 16px', background: canContinueAi ? '#111827' : '#94a3b8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, cursor: canContinueAi ? 'pointer' : 'default' }}>AI 继续工作</button>
            </div>
        </main >
    )
}
