"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiUrl } from '../../../../lib/api'

const card: React.CSSProperties = { padding: 18, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }
const finalDocumentStatuses = new Set(['published', 'completed', 'final'])

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : []
}

function label(item: any): string {
  return String(item?.title || item?.name || item?.description || item?.action || item?.queue_id || item?.action_id || '').trim()
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isRuntimeDisplayValue(value: unknown): boolean {
  return value === null || typeof value === 'string' || (isRecord(value) && ['title', 'name', 'description', 'action'].some((key) => typeof value[key] === 'string'))
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isValidDateString(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(new Date(value).getTime())
}

function isRuntimeStateItem(value: unknown): boolean {
  return Boolean(isRecord(value) && isNonEmptyString(value.code) && (typeof value.value === 'boolean' || typeof value.value === 'string' || isFiniteNumber(value.value)))
}

function isRuntimeAction(value: unknown): boolean {
  return Boolean(isRecord(value) && isNonEmptyString(value.action_id) && isNonEmptyString(value.type) && isNonEmptyString(value.work_id) && ['READY', 'BLOCKED'].includes(value.status) && isRecord(value.payload))
}

function isTodayQueueItem(value: unknown): boolean {
  return Boolean(isRecord(value) && isNonEmptyString(value.queue_id) && isNonEmptyString(value.action_id) && isNonEmptyString(value.work_id) && ['NOW', 'TODAY', 'LATER'].includes(value.slot) && ['READY', 'BLOCKED'].includes(value.status) && isFiniteNumber(value.order) && (value.execution_status === undefined || isNonEmptyString(value.execution_status)))
}

function isRuntimeNextStep(value: unknown): boolean {
  return Boolean(isRecord(value) && isNonEmptyString(value.title) && isNonEmptyString(value.reason) && isFiniteNumber(value.estimated_minutes) && isNonEmptyString(value.next_state) && isNonEmptyString(value.lawyer_action) && isFiniteNumber(value.priority) && isNonEmptyString(value.target_workspace) && (value.action === undefined || typeof value.action === 'string') && (value.priority_label === undefined || typeof value.priority_label === 'string'))
}

function isRuntimeData(value: unknown, currentMatterId: string): value is Record<string, any> {
  if (!isRecord(value)) return false
  if (!isRecord(value.matter) || value.matter.matter_id !== currentMatterId) return false
  if (!Array.isArray(value.runtime_state) || !value.runtime_state.every(isRuntimeStateItem)) return false
  if (!isRecord(value.runtime_decision) || !isNonEmptyString(value.runtime_decision.code) || !Array.isArray(value.runtime_decision.source) || !value.runtime_decision.source.every(isNonEmptyString)) return false
  if (!isRecord(value.runtime_plan) || !isNonEmptyString(value.runtime_plan.goal) || !isNonEmptyString(value.runtime_plan.priority) || !isNonEmptyString(value.runtime_plan.source_decision) || !Array.isArray(value.runtime_plan.steps) || !value.runtime_plan.steps.every((step: unknown) => typeof step === 'string') || !isValidDateString(value.runtime_plan.generated_at)) return false
  if (!isRuntimeNextStep(value.runtime_next_step)) return false
  if (!Array.isArray(value.runtime_actions) || !value.runtime_actions.every(isRuntimeAction)) return false
  if (!Array.isArray(value.today_queue) || !value.today_queue.every(isTodayQueueItem)) return false
  if (!isRecord(value.snapshot_facts) || value.snapshot_facts.matter_id !== currentMatterId || !isRecord(value.snapshot_facts.counts) || !['tasks', 'documents', 'evidence', 'research', 'timeline'].every((key) => isFiniteNumber(value.snapshot_facts.counts[key])) || !isValidDateString(value.snapshot_facts.generated_at)) return false
  if (!isValidDateString(value.generated_at)) return false
  if (value.execution_advice !== undefined && !isRuntimeDisplayValue(value.execution_advice)) return false
  for (const key of ['execution_plan', 'asset_clues', 'confirmed_asset_clues', 'execution_materials']) {
    if (value[key] !== undefined && (!Array.isArray(value[key]) || !value[key].every(isRuntimeDisplayValue))) return false
  }
  return true
}

export default function ExecutionWorkspacePage() {
  const params = useParams() as { matter_id?: string }
  const router = useRouter()
  const matterId = String(params?.matter_id || '')
  const [runtime, setRuntime] = useState<any | null>(null)
  const [execution, setExecution] = useState<any[] | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [runtimeLoaded, setRuntimeLoaded] = useState(false)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [executionError, setExecutionError] = useState<string | null>(null)
  const [documentsError, setDocumentsError] = useState<string | null>(null)
  const [documentsLoaded, setDocumentsLoaded] = useState(false)

  async function load() {
    setLoading(true)
    setRuntimeLoaded(false)
    setRuntimeError(null)
    setExecutionError(null)
    setDocumentsError(null)
    setDocumentsLoaded(false)
    const runtimeRequest = fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/runtime`), { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`runtime_http_${response.status}`)
        const body = await response.json().catch(() => { throw new Error('runtime_invalid_response') })
        if (!isRuntimeData(body, matterId)) throw new Error('runtime_invalid_response')
        return body
      })
      .then((data) => { setRuntime(data); setRuntimeLoaded(true) })
      .catch((error: any) => { setRuntime(null); setRuntimeLoaded(false); setRuntimeError(error?.message === 'runtime_invalid_response' ? 'AI Runtime 返回数据暂不可用' : 'AI Runtime 加载失败，请稍后重试') })

    const executionRequest = fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/execution`), { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`execution_http_${response.status}`)
        const body = await response.json().catch(() => { throw new Error('execution_invalid_response') })
        if (!Array.isArray(body)) throw new Error('execution_invalid_response')
        setExecution(body)
      })
      .catch((error: any) => { setExecution(null); setExecutionError(error?.message === 'execution_invalid_response' ? 'Execution 返回数据暂不可用' : 'Execution 数据加载失败，请稍后重试') })

    const documentRequest = fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/documents`), { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('documents_request_failed')
        const body = await response.json().catch(() => { throw new Error('documents_invalid_response') })
        if (!Array.isArray(body)) throw new Error('documents_invalid_response')
        setDocuments(body)
        setDocumentsLoaded(true)
      })
      .catch((error: any) => {
        setDocumentsError(error?.message === 'documents_invalid_response' ? '正式文书返回数据暂不可用' : '无法加载正式文书状态，请稍后重试')
      })

    await Promise.all([runtimeRequest, executionRequest, documentRequest])
    setLoading(false)
  }

  useEffect(() => { if (matterId) load() }, [matterId])

  if (loading) return <main style={{ padding: 28 }}>正在加载执行工作区…</main>

  const adviceValue = runtime?.runtime_next_step || runtime?.execution_advice
  const advice = typeof adviceValue === 'string' ? adviceValue : label(adviceValue)
  const plan = asArray(runtime?.execution_plan || runtime?.runtime_plan?.steps)
  const assetClues = asArray(runtime?.asset_clues || runtime?.confirmed_asset_clues)
  const materials = asArray(runtime?.execution_materials)
  const hasFinalDocument = documents.some((document) => finalDocumentStatuses.has(String(document?.status || '').toLowerCase()))

  return (
    <main className="lawdesk-workspace" style={{ padding: 28, background: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <button onClick={() => router.push(`/matters/${encodeURIComponent(matterId)}`)} style={{ border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer' }}>← 返回案件概览</button>
        <h1>执行工作区</h1>
        {runtimeError ? <div style={{ ...card, color: '#b91c1c' }}>{runtimeError}<button onClick={load} style={{ marginLeft: 12 }}>重新加载</button></div> : null}
        {executionError ? <div style={{ ...card, color: '#b91c1c', marginTop: 12 }}>{executionError}<button onClick={load} style={{ marginLeft: 12 }}>重新加载</button></div> : null}
        {documentsError ? <div style={{ ...card, color: '#b91c1c', marginTop: 12 }}>{documentsError}<button onClick={load} style={{ marginLeft: 12 }}>重新加载</button></div> : null}
        <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
          {runtimeLoaded && !runtimeError ? (
            <>
              <section style={card}><h2>AI 状态</h2>AI Runtime 已启动</section>
              <section style={card}><h2>执行建议</h2>{advice || '暂无执行建议'}</section>
              <section style={card}><h2>执行计划</h2>{plan.length ? plan.map((item, index) => <div key={item?.id || index}>{typeof item === 'string' ? item : label(item)}</div>) : '尚未建立执行计划'}</section>
              <section style={card}><h2>财产线索</h2>{assetClues.length ? assetClues.map((item, index) => <div key={item?.id || index}>{typeof item === 'string' ? item : label(item)}</div>) : '暂无已确认的财产线索'}</section>
              <section style={card}><h2>执行材料</h2>{materials.length ? materials.map((item, index) => <div key={item?.id || index}>{typeof item === 'string' ? item : label(item)}</div>) : '暂无执行材料'}</section>
            </>
          ) : null}
          <section style={card}><h2>执行状态</h2>{execution && execution.length ? execution.map((item, index) => <div key={item?.queue_id || item?.action_id || index}>{label(item) || '未命名执行事项'} · {String(item?.execution_status || item?.status || '')}</div>) : execution ? '尚未建立执行计划' : '—'}</section>
          {documentsLoaded && !hasFinalDocument ? <section style={card}>请先完成并发布正式 Document。<button onClick={() => router.push(`/matters/${encodeURIComponent(matterId)}/documents`)} style={{ marginLeft: 12 }}>前往文书工作区</button></section> : null}
        </div>
      </div>
    </main>
  )
}
