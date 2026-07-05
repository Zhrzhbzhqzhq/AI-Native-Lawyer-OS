"use client"

import React, { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type IntakeResponse = {
  job_id: string
  status: string
  source?: string
  analysis?: {
    summary: string
    detected_matter: { matter_id: string | null; confidence: number; reason: string }
    material_suggestions: any[]
    evidence_suggestions: any[]
    document_suggestions: any[]
    next_actions: any[]
  }
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'

export default function IntakePage() {
  const [files, setFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [clientContent, setClientContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<IntakeResponse | null>(null)
  const [drafts, setDrafts] = useState<any[] | null>(null)
  const [createdDocuments, setCreatedDocuments] = useState<any[] | null>(null)
  const [createdEvidence, setCreatedEvidence] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()

  function mergeFiles(next: FileList | File[]) {
    const incoming = Array.from(next)
    const map = new Map<string, File>()
    for (const f of files) map.set(`${f.name}:${f.size}:${f.lastModified}`, f)
    for (const f of incoming) map.set(`${f.name}:${f.size}:${f.lastModified}`, f)
    setFiles(Array.from(map.values()))
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer?.files?.length) mergeFiles(e.dataTransfer.files)
  }

  async function handleStartAnalysis() {
    setError(null)
    if (files.length === 0 && !clientContent.trim()) {
      setError('请提供文本或上传至少一个文件。')
      return
    }

    // Save draft locally for downstream demo pages, then navigate to analyzing demo.
    try {
      const draft = { clientContent, files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })) }
      sessionStorage.setItem('intake_draft', JSON.stringify(draft))
    } catch (e) {
      // ignore storage errors
    }
    setSubmitting(true)
    router.push('/intake/analyzing')
  }

  return (
    <main>
      <section style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
        <h2>AI 接案中心</h2>
        <div style={{ color: '#6b7280', marginTop: 6 }}>上传客户咨询和案件资料，AI 自动完成接案分析。</div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>客户咨询信息</div>
          <textarea
            value={clientContent}
            onChange={(e) => setClientContent(e.target.value)}
            placeholder={"请粘贴客户咨询内容。例如：微信聊天、电话录音转文字、当事人口述、AI整理后的咨询纪要"}
            style={{ width: '100%', minHeight: 160, padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>案件资料</div>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            style={{ border: '1px dashed #cbd5e1', padding: 20, borderRadius: 8, background: dragActive ? '#f8fafc' : 'transparent' }}
          >
            <div style={{ marginBottom: 8 }}>拖拽案件初步资料到这里 或点击上传</div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && mergeFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: '8px 12px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none' }}
            >
              选择文件
            </button>
            <div style={{ marginTop: 12, color: '#6b7280', fontSize: 13 }}>
              支持：PDF、Word、图片、微信截图、录音、视频
            </div>
            <div style={{ marginTop: 12 }}>
              {files.map((f) => (
                <div key={`${f.name}-${f.size}-${f.lastModified}`} style={{ padding: 6, borderBottom: '1px solid #eee' }}>
                  <div style={{ fontWeight: 600 }}>{f.name}</div>
                  <div style={{ color: '#6b7280' }}>{f.type} — {f.size} bytes</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        

        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={submitting}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600 }}
          >
            {submitting ? '正在分析...' : 'AI分析咨询'}
          </button>
          <div style={{ marginTop: 10, color: '#9ca3af', fontSize: 12, background: '#f8fafc', padding: 10, borderRadius: 6 }}>
            <div>AI 将自动完成：</div>
            <div style={{ marginTop: 6 }}>✓ 提取案件事实</div>
            <div>✓ 判断案件类型</div>
            <div>✓ 分析证据情况</div>
            <div>✓ 评估接案价值</div>
            <div>✓ 生成接案分析报告</div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>点击 AI分析咨询 后，不会立即创建 Matter。AI 将先生成接案分析报告，律师确认后才创建 Matter。</div>
          </div>
        </div>

        {error && <div style={{ marginTop: 12, color: '#b91c1c' }}>{error}</div>}

        {result && (
          <div style={{ marginTop: 20, background: '#f1f5f9', padding: 12, borderRadius: 8 }}>
            <div style={{ fontWeight: 700 }}>AI Summary</div>
            <div style={{ marginTop: 6 }}>{result.analysis?.summary}</div>

            <div style={{ marginTop: 12, fontWeight: 700 }}>建议</div>
            <div>材料建议: {result.analysis ? result.analysis.material_suggestions.length : 0}</div>
            <div>证据草稿建议: {result.analysis ? result.analysis.evidence_suggestions.length : 0}</div>
            <div>文书建议: {result.analysis ? result.analysis.document_suggestions.length : 0}</div>

            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(`${API}/intake/evidence-draft`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ matter_id: result.analysis?.detected_matter?.matter_id || null, materials: [] }),
                    })
                    if (!res.ok) throw new Error('draft failed')
                    const body = await res.json()
                    setDrafts(Array.isArray(body.evidence_drafts) ? body.evidence_drafts : [])
                  } catch (e: any) {
                    setError(e?.message || 'Draft failed')
                  }
                }}
                style={{ marginTop: 6, padding: '8px 12px', borderRadius: 8, background: '#f97316', color: '#fff', border: 'none' }}
              >
                生成证据草稿
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}