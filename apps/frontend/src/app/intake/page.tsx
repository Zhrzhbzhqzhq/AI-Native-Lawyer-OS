"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Uploader from './uploader/Uploader'

export default function IntakePage() {
  const router = useRouter()
  const [caseName, setCaseName] = useState('')
  const [client, setClient] = useState('')
  const [opponent, setOpponent] = useState('')
  const [caseType, setCaseType] = useState('')
  const [files, setFiles] = useState<Array<{ name: string; size: number; type?: string; upload_time: string }>>([])
  const [derivedMatterId, setDerivedMatterId] = useState<string | null>(null)
  const [receivedConfirmed, setReceivedConfirmed] = useState(false)

  useEffect(() => {
    try {
      const draft = sessionStorage.getItem('new_matter_draft')
      if (draft) {
        const obj = JSON.parse(draft || '{}')
        if (obj && obj.matter_id) {
          setDerivedMatterId(String(obj.matter_id))
          return
        }
      }
      const analysis = sessionStorage.getItem('intake_analysis')
      if (analysis) {
        const a = JSON.parse(analysis || '{}')
        if (a && a.matter_id) setDerivedMatterId(String(a.matter_id))
      }
    } catch (e) {
      // ignore
    }
  }, [])

  function handleStart() {
    // For V2: call backend AI create endpoint, then redirect to creating page
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'
        const res = await fetch(`${base}/intake/ai-create-matter`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: caseName, client_name: client, opponent_name: opponent, matter_type: caseType }) })
        if (res.status === 201) {
          const data = await res.json()
          try { sessionStorage.setItem('intake_analysis', JSON.stringify(data)) } catch (e) { }
          router.push('/intake/creating')
          return
        }
      } catch (e) {
        // fallback to local draft
        try { const draft = { caseName, client, opponent, caseType, files }; sessionStorage.setItem('new_matter_draft', JSON.stringify(draft)) } catch (e) { }
      }
      router.push('/intake/creating')
    })()
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>新建案件</h2>

        <div style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'block' }}>
            <div style={{ fontWeight: 600 }}>案件名称</div>
            <input value={caseName} onChange={(e) => setCaseName(e.target.value)} placeholder="填写案件名称" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e6eef6', marginTop: 6 }} />
          </label>

          <label style={{ display: 'block' }}>
            <div style={{ fontWeight: 600 }}>委托人</div>
            <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="填写委托人姓名或单位" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e6eef6', marginTop: 6 }} />
          </label>

          <label style={{ display: 'block' }}>
            <div style={{ fontWeight: 600 }}>对方当事人</div>
            <input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="填写对方当事人" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e6eef6', marginTop: 6 }} />
          </label>

          <label style={{ display: 'block' }}>
            <div style={{ fontWeight: 600 }}>案件类型</div>
            <input value={caseType} onChange={(e) => setCaseType(e.target.value)} placeholder="例如：民间借贷 / 合同 / 劳动" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e6eef6', marginTop: 6 }} />
          </label>

          {/* 手动填写 Matter ID 已移除 — matter_id 应来自当前 intake 流程状态（若存在） */}

          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>案件资料</div>

            <Uploader matterId={derivedMatterId || undefined} onUploaded={(saved) => { setFiles(saved); setReceivedConfirmed(true); try { sessionStorage.setItem('lawdesk_intake_uploaded_files', JSON.stringify(saved || [])) } catch (e) { } }} />

            {receivedConfirmed && files.length > 0 && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 8, border: '1px solid #f1f5f9', background: '#ffffff', color: '#111827' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>资料已接收</div>
                <div style={{ color: '#6b7280', marginBottom: 8 }}>已上传文件：{files.length} 个</div>
                <div style={{ color: '#6b7280', marginBottom: 12 }}>最近上传时间：{files.length > 0 ? new Date(files.reduce((a, b) => (new Date(a.upload_time) > new Date(b.upload_time) ? a : b)).upload_time).toLocaleString() : '-'}</div>
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => router.push('/intake/analyzing')} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontWeight: 700 }}>开始整理案件资料</button>
                </div>
              </div>
            )}

            {!receivedConfirmed && files.length > 0 && (
              <div style={{ marginTop: 12, border: '1px solid #f1f5f9', borderRadius: 8, background: '#fafafa', padding: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px 160px', gap: 8, padding: '8px 12px', fontWeight: 700, color: '#111827' }}>
                  <div>文件名</div>
                  <div>类型</div>
                  <div>大小</div>
                  <div>上传时间</div>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {files.map((f, i) => (
                    <li key={i} style={{ padding: '8px 12px', borderTop: i === 0 ? '1px solid #f1f5f9' : undefined, borderBottom: i < files.length - 1 ? '1px solid #f1f5f9' : 'none', color: '#111827', display: 'grid', gridTemplateColumns: '1fr 120px 110px 160px', gap: 8 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                      <div style={{ color: '#6b7280' }}>{f.type || '-'}</div>
                      <div style={{ color: '#6b7280' }}>{(f.size / 1024).toFixed(1)} KB</div>
                      <div style={{ color: '#6b7280' }}>{new Date(f.upload_time).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={handleStart} style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600 }}>开始整理案件</button>
          </div>
        </div>
      </div>
    </main>
  )
}