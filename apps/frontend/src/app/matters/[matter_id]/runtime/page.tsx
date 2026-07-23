"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiUrl } from '../../../../lib/api'

const card: React.CSSProperties = { padding: 18, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : []
}

function itemTitle(item: any): string {
  return String(item?.title || item?.name || item?.action || item?.description || item?.type || '').trim()
}

function itemTime(item: any): string {
  const raw = item?.time || item?.timestamp || item?.created_at || item?.updated_at || item?.completed_at
  if (!raw) return ''
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? String(raw) : date.toLocaleString('zh-CN')
}

export default function RuntimeDashboardPage() {
  const params = useParams() as { matter_id?: string }
  const router = useRouter()
  const matterId = String(params?.matter_id || '')
  const [runtime, setRuntime] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadRuntime() {
    setLoading(true)
    setError(null)
    if (!matterId) {
      setRuntime(null)
      setError('AI Runtime 返回数据暂不可用')
      setLoading(false)
      return
    }
    try {
      const response = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/runtime`), { cache: 'no-store' })
      if (!response.ok) {
        if (response.status === 404) {
          setRuntime(null)
          return
        }
        throw new Error(`runtime_http_${response.status}`)
      }
      const body = await response.json().catch(() => null)
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        setRuntime(null)
        setError('AI Runtime 返回数据暂不可用')
        return
      }
      setRuntime(body)
    } catch {
      setRuntime(null)
      setError('无法连接 AI Runtime，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRuntime() }, [matterId])

  if (loading) return <main style={{ padding: 28 }}>正在整理 AI 办案状态…</main>

  const today = asArray(runtime?.today_queue || runtime?.todayQueue)
  const actions = asArray(runtime?.runtime_actions || runtime?.runtimeActions)
  const logs = asArray(runtime?.logs || runtime?.events || runtime?.timeline)
  const planSteps = asArray(runtime?.runtime_plan?.steps || runtime?.runtimePlan?.steps)
  const running = [...today, ...actions].filter((item) => ['RUNNING', 'IN_PROGRESS'].includes(String(item?.status || item?.state || item?.execution_status || '').toUpperCase()))
  const completed = [...today, ...actions].filter((item) => ['DONE', 'COMPLETED'].includes(String(item?.status || item?.state || item?.execution_status || '').toUpperCase()))
  const waiting = [...today, ...actions].filter((item) => ['WAITING', 'WAITING_LAWYER', 'NEEDS_LAWYER', 'BLOCKED'].includes(String(item?.status || item?.state || item?.execution_status || '').toUpperCase()))
  const nextStep = runtime?.runtime_next_step || runtime?.runtimeNextStep
  const nextItems = [
    ...(typeof nextStep === 'string' ? [nextStep] : nextStep ? [itemTitle(nextStep)] : []),
    ...planSteps.map((step) => typeof step === 'string' ? step : itemTitle(step)),
  ].filter(Boolean)

  return (
    <main className="lawdesk-workspace" style={{ padding: 28, background: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <button onClick={() => router.push(`/matters/${encodeURIComponent(matterId)}`)} style={{ border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer' }}>← 返回案件概览</button>
        <h1>AI 工作中心</h1>
        {error ? <div style={{ ...card, color: '#b91c1c' }}>{error}<button onClick={loadRuntime} style={{ marginLeft: 12 }}>重新加载</button></div> : null}
        {!error && !runtime ? <div style={card}>AI Runtime 尚未启动</div> : null}
        {runtime ? <div style={{ display: 'grid', gap: 16 }}>
          <section style={card}><h2>正在执行</h2>{running.length ? running.map((item, index) => <div key={item?.id || index}>{itemTitle(item) || '未命名 Runtime 工作'}</div>) : <div>暂无正在执行的 AI 工作</div>}</section>
          <section style={card}><h2>今日进展</h2>{completed.length ? completed.map((item, index) => <div key={item?.id || index}>{itemTitle(item) || '未命名 Runtime 记录'}{itemTime(item) ? ` · ${itemTime(item)}` : ''}</div>) : <div>今日暂无 AI Runtime 记录</div>}</section>
          <section style={card}><h2>下一步建议</h2>{nextItems.length ? nextItems.map((item, index) => <div key={`${item}-${index}`}>{item}</div>) : <div>暂无 AI 下一步建议</div>}</section>
          <section style={card}><h2>待律师确认</h2>{waiting.length ? waiting.map((item, index) => <div key={item?.id || index}>{itemTitle(item) || '未命名待确认事项'}</div>) : <div>暂无待律师确认事项</div>}</section>
          <section style={card}><h2>Runtime 活动</h2>{logs.length ? logs.map((item, index) => <div key={item?.id || index}>{itemTitle(item) || '未命名 Runtime 活动'}{itemTime(item) ? ` · ${itemTime(item)}` : ''}</div>) : <div>暂无 Runtime 活动记录</div>}</section>
        </div> : null}
      </div>
    </main>
  )
}
