
"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AnalyzingPage() {
  const router = useRouter()

  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: number; type?: string; upload_time: string }>>([])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('lawdesk_intake_uploaded_files')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setUploadedFiles(parsed)
      }
    } catch (e) {
      // ignore
    }
  }, [])

  const steps = [
    { label: '提取案件事实', done: true },
    { label: '判断案件类型', done: true },
    { label: '识别当事人', done: true },
    { label: '提取时间轴', done: true },
    { label: '分析证据情况', done: true },
    { label: '评估诉讼风险', done: false },
    { label: '生成接案建议', done: false },
    { label: '生成接案分析报告', done: false },
  ]

  const logs = [
    '13:21:01 发现借款金额：100000元',
    '13:21:02 识别案件类型：民间借贷纠纷',
    '13:21:03 发现证据：银行转账记录',
    '13:21:04 发现证据：微信聊天记录',
    '13:21:05 风险提示：缺少正式借条',
  ]

  return (
    <main>
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
        <h2>AI 正在分析客户咨询</h2>
        <div style={{ color: '#6b7280', marginTop: 6 }}>LawDesk 正在提取案件事实、识别证据并生成接案分析报告。</div>

        <div style={{ display: 'flex', gap: 24, marginTop: 20 }}>
          <div style={{ flex: 1, background: '#fff', padding: 18, borderRadius: 8, border: '1px solid #eef2ff' }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>AI 工作流</div>
            <div>
              {steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', color: s.done ? '#0b5cff' : '#6b7280' }}>
                  <div style={{ width: 20 }}>{s.done ? '✓' : '○'}</div>
                  <div style={{ marginLeft: 8 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: 420, background: '#fff', padding: 18, borderRadius: 8, border: '1px solid #eef2ff' }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>已上传资料</div>
            <div style={{ fontSize: 13, color: '#111827' }}>
              {uploadedFiles && uploadedFiles.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {uploadedFiles.map((f, i) => (
                    <li key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 600 }}>{f.name}</div>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>{f.type || '-'} • {(f.size / 1024).toFixed(1)} KB • {new Date(f.upload_time).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ color: '#6b7280' }}>
                  <div style={{ marginBottom: 8 }}>尚未接收到案件资料</div>
                  <button onClick={() => router.push('/intake')} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontWeight: 700 }}>返回上传资料</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#0b5cff' }}>正在分析中……</div>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>预计还需 15 秒</div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                try {
                  const analysis = { title: '张三诉李四民间借贷纠纷', matter_type: '民间借贷纠纷', summary: 'AI 识别到民间借贷要件，建议接案。' }
                  sessionStorage.setItem('intake_analysis', JSON.stringify(analysis))
                } catch (e) { }
                router.push('/intake/report')
              }}
              style={{ padding: '10px 14px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none' }}
            >
              查看接案分析报告
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
