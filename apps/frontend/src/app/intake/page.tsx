"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Uploader from './uploader/Uploader'

export default function IntakePage() {
  const router = useRouter()
  const [caseName, setCaseName] = useState('')
  const [matterId, setMatterId] = useState('')
  const [client, setClient] = useState('')
  const [opponent, setOpponent] = useState('')
  const [caseType, setCaseType] = useState('')
  const [files, setFiles] = useState<Array<{ name: string; size: number; type?: string; upload_time: string }>>([])

  function handleStart() {
    // For V1: no backend. Save lightweight draft to sessionStorage and return to matters.
    try {
      const draft = { caseName, client, opponent, caseType, files }
      sessionStorage.setItem('new_matter_draft', JSON.stringify(draft))
    } catch (e) { }
    router.push('/intake/creating')
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

          <label style={{ display: 'block' }}>
            <div style={{ fontWeight: 600 }}>关联案件ID（可选）</div>
            <input value={matterId} onChange={(e) => setMatterId(e.target.value)} placeholder="已有 matter_id 则填写以直接保存到案件" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e6eef6', marginTop: 6 }} />
          </label>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>案件资料</div>

            <Uploader matterId={matterId || undefined} onUploaded={(saved) => setFiles(saved)} />

            {files.length > 0 && (
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