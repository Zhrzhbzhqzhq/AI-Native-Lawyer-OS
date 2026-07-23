"use client"

import React, { useCallback, useEffect, useState } from 'react'
import { apiUrl } from '../lib/api'

type Understanding = {
  identity: { title: string; caseType: string; stage: string; jurisdiction: string }
  narrative: { summary: string; background: string; currentPosture: string }
  actors: Array<{ id: string; name: string; role: string; position: string }>
  timeline: Array<{ id: string; date: string; event: string; certainty: 'confirmed' | 'disputed' | 'unknown' }>
  conflicts: Array<{ id: string; title: string; description: string }>
  unknowns: Array<{ id: string; question: string; importance: 'low' | 'medium' | 'high' }>
}

type ProductResult = {
  aiRecordId: string
  model: string
  generatedAt: string
  understanding: Understanding
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e6e7eb', padding: 20, borderRadius: 12 }
const section: React.CSSProperties = { marginTop: 18, paddingTop: 16, borderTop: '1px solid #f1f5f9' }

export default function CaseUnderstandingCard({ matterId, materialCount }: { matterId: string; materialCount: number }) {
  const [result, setResult] = useState<ProductResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLatest = useCallback(async () => {
    if (!matterId) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/case-understanding/latest`))
      if (response.status === 404) {
        setResult(null)
        return
      }
      if (!response.ok) throw new Error('load_failed')
      setResult(await response.json())
    } catch {
      setError('案件理解加载失败，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }, [matterId])

  useEffect(() => { void loadLatest() }, [loadLatest])

  async function generate() {
    setGenerating(true)
    setError(null)
    try {
      const response = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}/case-understanding/generate`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!response.ok) throw new Error('generate_failed')
      setResult(await response.json())
    } catch {
      setError('AI 暂时无法完成案件理解，请检查材料后重试。')
    } finally {
      setGenerating(false)
    }
  }

  const understanding = result?.understanding
  return (
    <section style={{ marginBottom: 24 }} aria-label="AI理解案件">
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>AI理解案件</div>
            <div style={{ color: '#64748b', marginTop: 5, fontSize: 13 }}>AI 仅根据当前案件材料整理，结果需由律师核对。</div>
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={generating || loading || materialCount === 0}
            style={{ padding: '9px 14px', borderRadius: 8, border: 0, background: '#111827', color: '#fff', fontWeight: 700, opacity: generating || loading || materialCount === 0 ? 0.55 : 1 }}
          >
            {generating ? '正在理解案件…' : understanding ? '重新理解案件' : 'AI理解案件'}
          </button>
        </div>

        {loading ? <div style={{ color: '#64748b', marginTop: 16 }}>正在加载案件理解…</div> : null}
        {!loading && materialCount === 0 ? <div style={{ color: '#64748b', marginTop: 16 }}>请先上传可读取的案件材料。</div> : null}
        {error ? <div role="alert" style={{ color: '#b91c1c', marginTop: 16 }}>{error}</div> : null}
        {!loading && !understanding && materialCount > 0 && !error ? (
          <div style={{ color: '#64748b', marginTop: 16 }}>尚未生成案件理解。点击“AI理解案件”，AI 将阅读当前 Matter 的全部可读材料。</div>
        ) : null}

        {understanding ? (
          <div style={{ marginTop: 16, color: '#374151', lineHeight: 1.7 }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {result?.model || 'AI'} · {result?.generatedAt ? new Date(result.generatedAt).toLocaleString() : '刚刚生成'}
            </div>

            <div style={section}>
              <h3 style={{ margin: 0, fontSize: 16 }}>案件概况</h3>
              <div style={{ marginTop: 8 }}>案件名称：{understanding.identity.title}</div>
              <div>案件类型：{understanding.identity.caseType}</div>
              <div>案件阶段：{understanding.identity.stage}</div>
              <div>管辖信息：{understanding.identity.jurisdiction}</div>
              <p>{understanding.narrative.summary}</p>
              <p style={{ marginBottom: 0 }}>当前状态：{understanding.narrative.currentPosture}</p>
            </div>

            <div style={section}>
              <h3 style={{ margin: 0, fontSize: 16 }}>当事人</h3>
              {understanding.actors.map((actor) => (
                <div key={actor.id} style={{ marginTop: 9 }}><strong>{actor.name}</strong> · {actor.role}<div style={{ color: '#64748b' }}>{actor.position}</div></div>
              ))}
            </div>

            <div style={section}>
              <h3 style={{ margin: 0, fontSize: 16 }}>时间线</h3>
              {understanding.timeline.length === 0 ? <div style={{ marginTop: 8 }}>暂无明确时间线</div> : understanding.timeline.map((item) => (
                <div key={item.id} style={{ marginTop: 9 }}><strong>{item.date}</strong> · {item.event}</div>
              ))}
            </div>

            <div style={section}>
              <h3 style={{ margin: 0, fontSize: 16 }}>核心争议</h3>
              {understanding.conflicts.map((item) => (
                <div key={item.id} style={{ marginTop: 9 }}><strong>{item.title}</strong><div style={{ color: '#64748b' }}>{item.description}</div></div>
              ))}
            </div>

            <div style={section}>
              <h3 style={{ margin: 0, fontSize: 16 }}>待确认事项</h3>
              {understanding.unknowns.length === 0 ? <div style={{ marginTop: 8 }}>暂无</div> : (
                <ul style={{ marginBottom: 0 }}>{understanding.unknowns.map((item) => <li key={item.id}>{item.question}</li>)}</ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
