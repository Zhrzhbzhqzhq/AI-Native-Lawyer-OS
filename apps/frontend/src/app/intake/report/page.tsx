"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Draft = {
  caseName?: string
  client?: string
  opponent?: string
  caseType?: string
  files?: string[]
}

export default function ReportPage() {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('new_matter_draft')
      if (raw) setDraft(JSON.parse(raw))
      else setDraft(null)
    } catch (e) {
      setDraft(null)
    }
  }, [])

  const summary = draft ? (
    <div>
      <div style={{ fontWeight: 700 }}>{draft.caseName || '未命名案件'}</div>
      <div style={{ color: '#64748b', marginTop: 6 }}>{draft.caseType || '未知类型'}</div>
      <div style={{ marginTop: 8 }}>委托人：{draft.client || '未填写'}</div>
      <div>对方当事人：{draft.opponent || '未填写'}</div>
    </div>
  ) : (
    <div>无摘要数据。</div>
  )

  const timeline = draft ? (
    <ol>
      <li>立案准备 — {new Date().toLocaleDateString()}</li>
      <li>证据收集 — 预计 3 天</li>
      <li>起草文书 — 预计 5 天</li>
    </ol>
  ) : (
    <div>无时间线。</div>
  )

  const evidence = draft && draft.files && draft.files.length ? (
    <ul>
      {draft.files.map((f, i) => <li key={i}>{f}</li>)}
    </ul>
  ) : (
    <div>无上传文件记录。</div>
  )

  const todos = (
    <ul>
      <li>收集银行流水</li>
      <li>确认诉讼请求与证据清单</li>
      <li>安排证人证言采集</li>
    </ul>
  )

  return (
    <main style={{ padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>案件已整理完成</h2>
        <div style={{ color: '#64748b', marginBottom: 12 }}>以下为本次整理的汇总（模拟）。</div>

        <div style={{ display: 'grid', gap: 16 }}>
          <section style={{ background: '#fff', border: '1px solid #e6eef6', padding: 14, borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>1. 案件摘要</div>
            {summary}
          </section>

          <section style={{ background: '#fff', border: '1px solid #e6eef6', padding: 14, borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>2. 时间线</div>
            {timeline}
          </section>

          <section style={{ background: '#fff', border: '1px solid #e6eef6', padding: 14, borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>3. 证据目录</div>
            {evidence}
          </section>

          <section style={{ background: '#fff', border: '1px solid #e6eef6', padding: 14, borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>4. 待办事项</div>
            {todos}
          </section>

          <div style={{ marginTop: 8 }}>
            <button onClick={() => router.push('/matters')} style={{ padding: '10px 14px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff' }}>进入案件列表</button>
          </div>
        </div>
      </div>
    </main>
  )
}

