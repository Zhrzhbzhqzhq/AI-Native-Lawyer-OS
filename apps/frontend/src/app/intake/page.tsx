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

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || [])
    setFiles(list.map((f) => f.name))
  }

  function handleStart() {
    // For V1: no backend. Save lightweight draft to sessionStorage and return to matters.
    try {
      const draft = { caseName, client, opponent, caseType, files }
      sessionStorage.setItem('new_matter_draft', JSON.stringify(draft))
    } catch (e) { }
    router.push('/matters')
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>新建案件 V1</h2>
        <div style={{ color: '#64748b', marginBottom: 12 }}>本页面为 V1 骨架：不连接 AI、不上传到后端。</div>

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
            <div style={{ fontWeight: 600, marginBottom: 6 }}>上传案件资料（仅列名）</div>
            <input type="file" multiple onChange={handleFiles} />
            <div style={{ marginTop: 8, color: '#64748b' }}>{files.length ? files.join(', ') : '未选中文件'}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={handleStart} style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600 }}>开始整理案件</button>
          </div>
        </div>
      </div>
    </main>
  )
}