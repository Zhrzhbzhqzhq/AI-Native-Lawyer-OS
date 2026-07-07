"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ReportPage() {
  const router = useRouter()
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: number; type?: string; upload_time: string }>>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  // Mock content per M120.4 requirements
  const caseTitle = '张三诉李四 民间借贷纠纷'
  const clientName = '张三'

  return (
    <main style={{ padding: 28, background: '#ffffff', color: '#111827', minHeight: '80vh' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>案件已准备就绪</h1>
        <div style={{ marginTop: 8, color: '#6b7280' }}>AI 已完成案件初始化，你现在可以开始办案。</div>

        {/* 第一块：AI 已完成 */}
        <section style={{ marginTop: 24, background: '#fff', border: '1px solid #e6e7eb', padding: 20, borderRadius: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>AI 已完成</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#111827', lineHeight: 1.8 }}>
            <li>✓ 建立案件</li>
            <li>✓ 整理案件資料</li>
            <li>✓ 建立案件摘要</li>
            <li>✓ 建立时间线</li>
            <li>✓ 建立证据目录</li>
            <li>✓ 建立待办事项</li>
          </ul>
        </section>

        {/* 第二块：AI 建议下一步 */}
        <section style={{ marginTop: 20, background: '#fff', border: '1px solid #e6e7eb', padding: 20, borderRadius: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>AI 建议下一步</div>
          <div style={{ color: '#111827', lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700 }}>今天建议：</div>
            <ol style={{ marginTop: 8, paddingLeft: 18 }}>
              <li>上传银行流水</li>
              <li>上传微信聊天记录</li>
              <li>补充借条</li>
            </ol>
            <div style={{ marginTop: 12, fontWeight: 700 }}>预计耗时：</div>
            <div style={{ marginTop: 6 }}>20 分钟</div>
          </div>
        </section>

        {/* 第三块：案件摘要 */}
        <section style={{ marginTop: 20, background: '#fff', border: '1px solid #e6e7eb', padding: 20, borderRadius: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>案件摘要</div>
          <div style={{ color: '#374151', lineHeight: 1.8 }}>
            <p>张三称其于 2024 年向李四出借人民币 100,000 元，双方通过微信达成借款意向，支付记录显示张三曾向李四转账。客户提供了部分聊天记录与转账截图。</p>
            <p>经初步整理，证据链显示借款事实成立，但缺少明确的借条与完整银行流水以证明全部转账细节。建议优先补全银行流水并固定被告身份信息。</p>
            <p>基于现有材料，建议立案准备并同步整理证据目录，随后开展法律检索以确定诉讼请求及管辖法院，最后生成起诉材料。</p>
          </div>
        </section>

        {/* 第四块：当前资料 Checklist */}
        <section style={{ marginTop: 20, background: '#fff', border: '1px solid #e6e7eb', padding: 20, borderRadius: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>当前资料</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#111827', lineHeight: 1.8 }}>
            <li>✓ 客户信息</li>
            <li>✓ 委托合同</li>
            <li>□ 银行流水</li>
            <li>□ 微信聊天记录</li>
            <li>□ 借条</li>
            <li>□ 录音</li>
          </ul>
        </section>

        {/* 上传的真实文件清单 */}
        <section style={{ marginTop: 20, background: '#fff', border: '1px solid #e6e7eb', padding: 20, borderRadius: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>已上传的案件资料</div>
          <div style={{ color: '#111827' }}>
            {uploadedFiles && uploadedFiles.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {uploadedFiles.map((f, i) => (
                  <li key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 600 }}>{f.name}</div>
                    <div style={{ color: '#6b7280', fontSize: 13 }}>{f.type || '-'} • {(f.size / 1024).toFixed(1)} KB • {new Date(f.upload_time).toLocaleString()}</div>
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
        </section>

        {/* 底部按钮 */}
        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button onClick={() => router.push('/matters')} style={{ background: '#111827', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 8, fontWeight: 700 }}>开始办案</button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {errorMessage ? (
              <div style={{ color: '#111827', background: '#fff', border: '1px solid #f1f5f9', padding: '10px 14px', borderRadius: 8, maxWidth: 640, textAlign: 'center' }}>{errorMessage}</div>
            ) : null}
            <button
              onClick={async () => {
                if (isProcessing) return
                setErrorMessage(null)
                setIsProcessing(true)
                try {
                  const raw = sessionStorage.getItem('lawdesk_intake_uploaded_files')
                  const uploaded = raw ? JSON.parse(raw) : []
                  const API = (process.env.NEXT_PUBLIC_API_BASE_URL as string) || 'http://localhost:4000'
                  const newMatterId = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
                  const title = caseTitle || '新案件'

                  // create matter
                  const res = await fetch(`${API}/matters`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ matter_id: newMatterId, title }),
                  })
                  if (!res.ok) {
                    setErrorMessage('创建案件失败，请稍后重试')
                    setIsProcessing(false)
                    return
                  }

                  // create materials
                  let materialError = false
                  for (const f of (Array.isArray(uploaded) ? uploaded : [])) {
                    try {
                      const material_id = `mat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
                      const payload = {
                        material_id,
                        title: f.name || 'unnamed',
                        material_type: 'uploaded',
                        source: 'client',
                        storage_uri: f.storage_uri || '',
                        status: 'active',
                      }
                      const mr = await fetch(`${API}/matters/${encodeURIComponent(newMatterId)}/materials`, {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify(payload),
                      })
                      if (!mr.ok) {
                        materialError = true
                        console.error('create material failed', await mr.text().catch(() => ''))
                        break
                      }
                    } catch (e) {
                      materialError = true
                      console.error('create material failed', e)
                      break
                    }
                  }

                  if (materialError) {
                    setErrorMessage('案件已创建，但资料归档失败，请稍后重试')
                    setIsProcessing(false)
                    return
                  }

                  // all succeeded
                  try {
                    sessionStorage.removeItem('lawdesk_intake_uploaded_files')
                    sessionStorage.removeItem('new_matter_draft')
                    sessionStorage.removeItem('intake_analysis')
                  } catch (e) { }

                  router.push(`/matters/${encodeURIComponent(newMatterId)}`)
                } catch (e) {
                  console.error(e)
                  setErrorMessage('创建案件失败，请稍后重试')
                  setIsProcessing(false)
                }
              }}
              disabled={isProcessing}
              style={{ background: isProcessing ? '#f3f4f6' : '#fff', color: '#111827', border: '1px solid #e6eef6', padding: '12px 20px', borderRadius: 8, fontWeight: 700, cursor: isProcessing ? 'default' : 'pointer' }}
            >
              {isProcessing ? '正在创建案件' : '确认接案'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

