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
  uploaded_path?: string
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

function makeMatterId() {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function buildDescription(draft: IntakeDraft, files: UploadedFile[]) {
  const lines = [
    `案件名称：${draft.caseName || '未填写'}`,
    `委托人：${draft.client || '未填写'}`,
    `对方当事人：${draft.opponent || '未填写'}`,
    `案件类型：${draft.caseType || '未填写'}`,
    `上传资料数量：${files.length}`,
    ...files.map((file, index) => `资料${index + 1}：${file.name}`),
  ]
  return lines.join('\n')
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

export default function ReportPage() {
  const router = useRouter()
  const [draft, setDraft] = useState<IntakeDraft>({})
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [analysis, setAnalysis] = useState<any | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [createdMatterId, setCreatedMatterId] = useState<string | null>(null)
  const [createdMaterialsCount, setCreatedMaterialsCount] = useState<number | null>(null)
  const [confirmedFields, setConfirmedFields] = useState<IntakeDraft>({})

  useEffect(() => {
    const storedDraft = readJson<IntakeDraft>('new_matter_draft', {})
    const storedFiles = readJson<UploadedFile[]>('lawdesk_intake_uploaded_files', [])
    const storedAnalysis = readJson<any | null>('intake_analysis', null)
    const files = Array.isArray(storedFiles) && storedFiles.length > 0
      ? storedFiles
      : Array.isArray(storedDraft.files)
        ? storedDraft.files
        : []

    const matterDraft = storedAnalysis?.analysis?.matter_draft || storedAnalysis?.matter_draft
    const nextDraft = mergeDraftWithMatterDraft(storedDraft, matterDraft)
    setDraft(nextDraft)
    setConfirmedFields(nextDraft)
    setUploadedFiles(files)
    setAnalysis(storedAnalysis)
  }, [])

  const nextActions = useMemo(() => (
    Array.isArray(analysis?.analysis?.next_actions) ? analysis.analysis.next_actions : []
  ), [analysis])

  const matterDraft = analysis?.analysis?.matter_draft || analysis?.matter_draft
  const detectedMatter = analysis?.analysis?.detected_matter
  const canConfirm = Boolean(confirmedFields.caseName?.trim()) && uploadedFiles.length > 0

  async function confirmMatter() {
    if (isProcessing) return
    setErrorMessage(null)
    setCreatedMatterId(null)
    setCreatedMaterialsCount(null)

    if (!canConfirm) {
      setErrorMessage('请先填写案件名称并上传案件资料')
      return
    }

    setIsProcessing(true)
    try {
      const matterId = makeMatterId()
      const createMatter = await fetch(apiUrl('/matters'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          matter_id: matterId,
          title: String(confirmedFields.caseName || '').trim(),
          description: buildDescription(confirmedFields, uploadedFiles),
          matter_type: String(confirmedFields.caseType || ''),
        }),
      })

      if (!createMatter.ok) {
        const message = await createMatter.text().catch(() => '')
        throw new Error(`create matter failed ${createMatter.status} ${message}`)
      }

      const materialRes = await fetch(apiUrl('/intake/confirm-material'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          matter_id: matterId,
          source: 'client',
          files: uploadedFiles.map((file) => ({
            name: file.name,
            mime_type: file.type || '',
            storage_uri: file.storage_uri || file.uploaded_path || '',
          })),
          analysis,
          idempotency_key: `intake-${matterId}`,
        }),
      })

      if (!materialRes.ok) {
        const message = await materialRes.text().catch(() => '')
        throw new Error(`create materials failed ${materialRes.status} ${message}`)
      }

      const materialJson = await materialRes.json()
      const count = Array.isArray(materialJson?.created_materials) ? materialJson.created_materials.length : 0
      setCreatedMatterId(matterId)
      setCreatedMaterialsCount(count)

      try {
        sessionStorage.removeItem('lawdesk_intake_uploaded_files')
        sessionStorage.removeItem('new_matter_draft')
        sessionStorage.removeItem('intake_analysis')
      } catch {
        // ignore
      }

      router.push(`/matters/${encodeURIComponent(matterId)}`)
    } catch (e) {
      console.error(e)
      setErrorMessage('创建案件或归档资料失败，请稍后重试')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <main style={{ padding: 28, background: '#ffffff', color: '#111827', minHeight: '80vh' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>案件草稿</h1>
        <div style={{ marginTop: 8, color: '#6b7280' }}>
          以下内容由 AI 根据材料生成，请律师审核并修改。
        </div>

        <section style={{ marginTop: 24, background: '#fff', border: '1px solid #e6e7eb', padding: 20, borderRadius: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>案件草稿</div>
          <div style={{ color: '#374151', display: 'grid', gap: 10 }}>
            <label>
              <div style={{ fontWeight: 700 }}>案件名称</div>
              <input value={confirmedFields.caseName || ''} onChange={(e) => setConfirmedFields((prev) => ({ ...prev, caseName: e.target.value }))} placeholder="未能自动识别，请律师补充" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e6eef6', marginTop: 6 }} />
            </label>
            <label>
              <div style={{ fontWeight: 700 }}>委托人</div>
              <input value={confirmedFields.client || ''} onChange={(e) => setConfirmedFields((prev) => ({ ...prev, client: e.target.value }))} placeholder="未能自动识别，请律师补充" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e6eef6', marginTop: 6 }} />
            </label>
            <label>
              <div style={{ fontWeight: 700 }}>对方当事人</div>
              <input value={confirmedFields.opponent || ''} onChange={(e) => setConfirmedFields((prev) => ({ ...prev, opponent: e.target.value }))} placeholder="未能自动识别，请律师补充" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e6eef6', marginTop: 6 }} />
            </label>
            <label>
              <div style={{ fontWeight: 700 }}>案件类型</div>
              <input value={confirmedFields.caseType || ''} onChange={(e) => setConfirmedFields((prev) => ({ ...prev, caseType: e.target.value }))} placeholder="未能自动识别，请律师补充" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e6eef6', marginTop: 6 }} />
            </label>
            {['caseName', 'client', 'opponent', 'caseType'].some((key) => !String((confirmedFields as any)[key] || '').trim()) ? (
              <div style={{ color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 10, fontSize: 13 }}>
                部分字段未能自动识别，请律师补充后再确认建立案件。
              </div>
            ) : null}
            {matterDraft?.confidence ? (
              <div style={{ color: '#6b7280', fontSize: 13 }}>
                抽取置信度：案件名称 {Math.round((matterDraft.confidence.title || 0) * 100)}%，委托人 {Math.round((matterDraft.confidence.client || 0) * 100)}%，对方当事人 {Math.round((matterDraft.confidence.opponent || 0) * 100)}%，案件类型 {Math.round((matterDraft.confidence.matter_type || 0) * 100)}%。
              </div>
            ) : null}
          </div>
        </section>

        <section style={{ marginTop: 20, background: '#fff', border: '1px solid #e6e7eb', padding: 20, borderRadius: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Intake 分析</div>
          {analysis ? (
            <div style={{ color: '#374151', lineHeight: 1.8 }}>
              <div><strong>分析状态：</strong>{analysis.status || '未返回'}</div>
              <div><strong>资料来源：</strong>{analysis.source || '未返回'}</div>
              <div><strong>分析任务：</strong>{analysis.job_id || '未返回'}</div>
              <div><strong>关联 Matter：</strong>{detectedMatter?.matter_id || '尚未关联'}</div>
              <div><strong>匹配置信度：</strong>{typeof detectedMatter?.confidence === 'number' ? `${Math.round(detectedMatter.confidence * 100)}%` : '未返回'}</div>
              {nextActions.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 700 }}>建议动作</div>
                  <ol style={{ marginTop: 8, paddingLeft: 18 }}>
                    {nextActions.map((action: any) => (
                      <li key={String(action)}>{String(action)}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ color: '#6b7280' }}>尚未生成 Intake 分析结果</div>
          )}
        </section>

        <section style={{ marginTop: 20, background: '#fff', border: '1px solid #e6e7eb', padding: 20, borderRadius: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>已上传资料</div>
          {uploadedFiles.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {uploadedFiles.map((file, index) => (
                <li key={`${file.name}-${index}`} style={{ padding: '10px 0', borderBottom: index < uploadedFiles.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ fontWeight: 600 }}>{file.name}</div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>
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
        </section>

        <section style={{ marginTop: 20, background: '#fff', border: '1px solid #e6e7eb', padding: 20, borderRadius: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>确认后将执行</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#374151', lineHeight: 1.8 }}>
            <li>创建一个新的 Matter</li>
            <li>将本次上传资料持久化为 Material</li>
            <li>进入 Matter Workspace 继续办理</li>
          </ul>
          {createdMatterId ? (
            <div style={{ marginTop: 12, color: '#111827' }}>
              Matter：{createdMatterId}；Material：{createdMaterialsCount ?? 0}
            </div>
          ) : null}
        </section>

        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button onClick={() => router.push('/intake')} style={{ background: '#fff', color: '#111827', border: '1px solid #e6eef6', padding: '12px 20px', borderRadius: 8, fontWeight: 700 }}>返回修改</button>
          <button
            onClick={confirmMatter}
            disabled={isProcessing || !canConfirm}
            style={{ background: isProcessing || !canConfirm ? '#94a3b8' : '#111827', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 8, fontWeight: 700, cursor: isProcessing || !canConfirm ? 'default' : 'pointer' }}
          >
            {isProcessing ? '正在创建案件' : '确认建立案件'}
          </button>
        </div>

        {errorMessage ? (
          <div style={{ marginTop: 16, color: '#b91c1c', textAlign: 'center' }}>{errorMessage}</div>
        ) : null}
      </div>
    </main>
  )
}
