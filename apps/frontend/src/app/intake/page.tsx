"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function IntakePage() {
  const router = useRouter()
  const [caseName, setCaseName] = useState('')
  const [client, setClient] = useState('')
  const [opponent, setOpponent] = useState('')
  const [caseType, setCaseType] = useState('')
  const [files, setFiles] = useState<string[]>([])
  const [showMockFiles, setShowMockFiles] = useState(false)

  const mockFiles = ['微信聊天记录.pdf', '转账记录.pdf', '借条照片.jpg']

  function handleClickUploadArea() {
    // Simulate adding files locally for V1
    setFiles(mockFiles)
    setShowMockFiles(true)
  }

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

          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>案件资料</div>

            <div
              role="button"
              onClick={handleClickUploadArea}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickUploadArea() }}
              tabIndex={0}
              style={{
                border: '1px dashed #e6e7eb',
                borderRadius: 8,
                padding: 18,
                cursor: 'pointer',
                color: '#111827',
                background: '#ffffff'
              }}
            >
              <div style={{ fontWeight: 600 }}>拖拽案件资料到这里</div>
              <div style={{ marginTop: 6, color: '#6b7280' }}>或点击添加资料</div>
              <div style={{ marginTop: 8, color: '#6b7280', fontSize: 13 }}>支持 PDF、Word、图片、录音、视频、压缩包</div>
            </div>

            {showMockFiles && files.length > 0 && (
              <div style={{ marginTop: 12, border: '1px solid #f1f5f9', borderRadius: 8, background: '#fafafa' }}>
                <ul style={{ listStyle: 'none', padding: 12, margin: 0 }}>
                  {files.map((f, i) => (
                    <li key={i} style={{ padding: '8px 6px', borderBottom: i < files.length - 1 ? '1px solid #f1f5f9' : 'none', color: '#111827' }}>{f}</li>
                  ))}
                </ul>
                <div style={{ padding: 12, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                  <button onClick={() => { /* keep local mock flow */ setShowMockFiles(true) }} style={{ background: 'transparent', border: 'none', color: '#111827', fontWeight: 600, cursor: 'pointer' }}>继续添加资料</button>
                </div>
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