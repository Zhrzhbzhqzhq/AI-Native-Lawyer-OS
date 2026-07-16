"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiUrl } from '../../../lib/api'

type UploadedFile = {
  name: string
  size: number
  type?: string
  upload_time: string
  content?: string
  storage_uri?: string
}

type IntakeDraft = {
  caseName?: string
  client?: string
  opponent?: string
  caseType?: string
  files?: UploadedFile[]
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function mergeDraftWithMatterDraft(draft: IntakeDraft, matterDraft: any): IntakeDraft {
  if (!matterDraft || typeof matterDraft !== 'object') return draft
  return {
    ...draft,
    caseName: String(matterDraft.title || draft.caseName || ''),
    client: String(matterDraft.client || draft.client || ''),
    opponent: String(matterDraft.opponent || draft.opponent || ''),
    caseType: String(matterDraft.matter_type || draft.caseType || ''),
  }
}

function isIntakeAnalysis(value: unknown): value is {
  status: 'analysis_ready'
  files: Array<{ name: string; size?: number; type?: string }>
  analysis: { matter_draft: { title: string; client: string; opponent: string; matter_type: string }; next_actions?: unknown[] }
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const result = value as any
  if (result.status !== 'analysis_ready' || !Array.isArray(result.files)) return false
  if (!result.analysis || typeof result.analysis !== 'object' || Array.isArray(result.analysis)) return false
  const matterDraft = result.analysis.matter_draft
  if (!matterDraft || typeof matterDraft !== 'object' || Array.isArray(matterDraft)) return false
  if (!['title', 'client', 'opponent', 'matter_type'].every((key) => typeof matterDraft[key] === 'string')) return false
  if (!result.files.every((file: any) => file && typeof file === 'object' && typeof file.name === 'string' && (file.size === undefined || typeof file.size === 'number') && (file.type === undefined || typeof file.type === 'string'))) return false
  if (result.analysis.evidence_drafts !== undefined && !Array.isArray(result.analysis.evidence_drafts)) return false
  if (result.evidence_drafts !== undefined && !Array.isArray(result.evidence_drafts)) return false
  return true
}

export default function AnalyzingPage() {
  const router = useRouter()
  const [draft, setDraft] = useState<IntakeDraft>({})
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [analysis, setAnalysis] = useState<any | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedDraft = readJson<IntakeDraft>('new_matter_draft', {})
    const storedFiles = readJson<UploadedFile[]>('lawdesk_intake_uploaded_files', [])
    const files = Array.isArray(storedFiles) && storedFiles.length > 0
      ? storedFiles
      : Array.isArray(storedDraft.files)
        ? storedDraft.files
        : []

    setDraft(storedDraft)
    setUploadedFiles(files)

    let active = true
    async function analyze() {
      setLoading(true)
      setErrorMessage(null)
      if (files.length === 0) {
        setErrorMessage('尚未接收到可分析的案件资料')
        setLoading(false)
        return
      }

      try {
        const res = await fetch(apiUrl('/intake'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'client',
            files: files.map((file) => ({
              name: file.name,
              size: file.size,
              type: file.type,
              content: file.content,
              storage_uri: file.storage_uri || (file as any).uploaded_path,
            })),
          }),
        })

        if (!res.ok) throw new Error(`request_failed:${res.status}`)
        const json = await res.json().catch(() => { throw new Error('invalid_json') })
        if (!isIntakeAnalysis(json)) throw new Error('invalid_response')
        if (!active) return

        setAnalysis(json)
        sessionStorage.setItem('intake_analysis', JSON.stringify(json))
        const nextDraft = mergeDraftWithMatterDraft(storedDraft, json.analysis.matter_draft)
        setDraft(nextDraft)
        sessionStorage.setItem('new_matter_draft', JSON.stringify({ ...nextDraft, files }))
      } catch (e: any) {
        if (!active) return
        setAnalysis(null)
        if (e?.message === 'invalid_json' || e?.message === 'invalid_response') setErrorMessage('Intake 返回数据暂不可用')
        else setErrorMessage('资料分析失败，请返回后重试')
      } finally {
        if (active) setLoading(false)
      }
    }

    analyze()
    return () => {
      active = false
    }
  }, [])

  const steps = useMemo(() => [
    { label: '接收上传资料', done: uploadedFiles.length > 0 },
    { label: '提交 Intake 分析', done: Boolean(analysis) },
    { label: '生成接案分析结果', done: Boolean(analysis?.status) },
    { label: '等待律师确认接案', done: false },
  ], [uploadedFiles.length, analysis])

  const nextActions = Array.isArray(analysis?.analysis?.next_actions) ? analysis.analysis.next_actions : []

  return (
    <main>
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
        <h2>AI 正在分析客户咨询</h2>
        <div style={{ color: '#6b7280', marginTop: 6 }}>
          LawDesk 正在基于本次上传的案件资料生成接案分析。
        </div>

        <div style={{ display: 'flex', gap: 24, marginTop: 20 }}>
          <div style={{ flex: 1, background: '#fff', padding: 18, borderRadius: 8, border: '1px solid #eef2ff' }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Intake 工作流</div>
            <div>
              {steps.map((step, index) => (
                <div key={step.label} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', color: step.done ? '#0b5cff' : '#6b7280' }}>
                  <div style={{ width: 20 }}>{step.done ? '✓' : index === steps.length - 1 ? '○' : loading ? '…' : '○'}</div>
                  <div style={{ marginLeft: 8 }}>{step.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, color: '#374151', lineHeight: 1.7 }}>
              <div><strong>案件名称：</strong>{draft.caseName || '未填写'}</div>
              <div><strong>委托人：</strong>{draft.client || '未填写'}</div>
              <div><strong>对方当事人：</strong>{draft.opponent || '未填写'}</div>
              <div><strong>案件类型：</strong>{draft.caseType || '未填写'}</div>
            </div>

            {nextActions.length > 0 ? (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700 }}>系统建议动作</div>
                <ul style={{ marginTop: 8, paddingLeft: 18, color: '#374151' }}>
                  {nextActions.map((action: any) => (
                    <li key={String(action)}>{String(action)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div style={{ width: 420, background: '#fff', padding: 18, borderRadius: 8, border: '1px solid #eef2ff' }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>已上传资料</div>
            <div style={{ fontSize: 13, color: '#111827' }}>
              {uploadedFiles.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {uploadedFiles.map((file, index) => (
                    <li key={`${file.name}-${index}`} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 600 }}>{file.name}</div>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>
                        {file.type || '-'} · {(file.size / 1024).toFixed(1)} KB · {new Date(file.upload_time).toLocaleString()}
                      </div>
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
            <div style={{ fontWeight: 700, color: errorMessage ? '#b91c1c' : '#0b5cff' }}>
              {errorMessage || (loading ? '正在分析中……' : '分析完成')}
            </div>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>
              {loading ? '请稍候' : '可查看接案分析结果'}
            </div>
          </div>

          <div>
            <button
              type="button"
              disabled={loading || Boolean(errorMessage) || !analysis}
              onClick={() => router.push('/intake/report')}
              style={{ padding: '10px 14px', borderRadius: 8, background: loading || errorMessage || !analysis ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', cursor: loading || errorMessage || !analysis ? 'default' : 'pointer' }}
            >
              查看接案分析报告
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
