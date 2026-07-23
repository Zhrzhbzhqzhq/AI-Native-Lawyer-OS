"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiUrl } from '../../../../lib/api'

const card: React.CSSProperties = { padding: 18, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }

function rowsFrom(value: unknown): any[] {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object' && Array.isArray((value as any).research)) return (value as any).research
  return []
}

export default function ResearchWorkspacePage() {
  const params = useParams() as { matter_id?: string }
  const router = useRouter()
  const matterId = String(params?.matter_id || '')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadResearch() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/research`), { cache: 'no-store' })
      if (!response.ok) throw new Error(`research_http_${response.status}`)
      const body = await response.json().catch(() => null)
      if (body === null || (!Array.isArray(body) && typeof body !== 'object')) throw new Error('research_invalid_response')
      setRows(rowsFrom(body))
    } catch {
      setRows([])
      setError('法律检索数据加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (matterId) loadResearch() }, [matterId])

  async function createResearch() {
    if (!title.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/research`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), category: 'legal_research', status: 'pending' }),
      })
      if (!response.ok) throw new Error(`research_create_http_${response.status}`)
      setTitle('')
      setDescription('')
      await loadResearch()
    } catch {
      setError('创建法律检索任务失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  const legalOpinions = useMemo(() => rows.filter((row) => String(row?.category || '').toLowerCase().includes('opinion') || String(row?.type || '').toLowerCase().includes('opinion')), [rows])
  const nextActions = useMemo(() => rows.flatMap((row) => Array.isArray(row?.next_actions) ? row.next_actions : []), [rows])

  return (
    <main className="lawdesk-workspace" style={{ padding: 28, background: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <button onClick={() => router.push(`/matters/${encodeURIComponent(matterId)}`)} style={{ border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer' }}>← 返回案件概览</button>
        <h1>法律检索</h1>
        {error ? <div style={{ ...card, color: '#b91c1c' }}>{error}<button onClick={loadResearch} style={{ marginLeft: 12 }}>重新加载</button></div> : null}
        <section style={{ ...card, marginTop: 16 }}>
          <h2>新建检索任务</h2>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="请输入检索主题" style={{ width: '100%', padding: 10, boxSizing: 'border-box' }} />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="请输入检索范围或律师要求" style={{ width: '100%', minHeight: 90, padding: 10, marginTop: 10, boxSizing: 'border-box' }} />
          <button disabled={!title.trim() || saving} onClick={createResearch} style={{ marginTop: 10 }}>{saving ? '提交中…' : '创建检索任务'}</button>
        </section>
        <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
          <section style={card}><h2>检索任务与结果</h2>{loading ? '正在加载…' : rows.length ? rows.map((row, index) => <article key={row?.research_id || row?.id || index} style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}><strong>{String(row?.title || '未命名检索')}</strong><div>{String(row?.description || row?.summary || '')}</div><small>{String(row?.status || '')}</small></article>) : '尚未开始法律检索'}</section>
          <section style={card}><h2>检索统计</h2><div>案例：—　法条：—　司法解释：—　裁判规则：—</div></section>
          <section style={card}><h2>法律意见</h2>{legalOpinions.length ? legalOpinions.map((row, index) => <div key={row?.research_id || row?.id || index}>{String(row?.description || row?.summary || row?.title || '')}</div>) : '尚未形成法律意见'}</section>
          <section style={card}><h2>下一步建议</h2>{nextActions.length ? nextActions.map((item, index) => <div key={item?.id || index}>{typeof item === 'string' ? item : String(item?.title || item?.description || '')}</div>) : '暂无 Research 下一步建议'}</section>
          {!loading && rows.length === 0 ? <section style={card}>暂无检索结果</section> : null}
        </div>
      </div>
    </main>
  )
}
