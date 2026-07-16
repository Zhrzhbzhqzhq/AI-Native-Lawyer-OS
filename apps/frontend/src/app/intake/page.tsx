"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Uploader, { isUploadedFile, type UploadedFile } from './uploader/Uploader'

export default function IntakePage() {
  const router = useRouter()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [derivedMatterId, setDerivedMatterId] = useState<string | null>(null)
  const [receivedConfirmed, setReceivedConfirmed] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  function saveValidatedUpload(saved: unknown) {
    if (!Array.isArray(saved) || saved.length === 0 || !saved.every(isUploadedFile)) {
      setFiles([])
      setReceivedConfirmed(false)
      setErrorMessage('上传返回数据暂不可用')
      return
    }

    const readableFiles = saved.filter((file) => isUploadedFile(file) && file.storage_uri.startsWith('storage/intake-uploads/'))
    if (readableFiles.length === 0) {
      setFiles([])
      setReceivedConfirmed(false)
      setErrorMessage('未收到可用的已保存文件')
      return
    }

    try {
      const draft = { caseName: '', client: '', opponent: '', caseType: '', files: readableFiles }
      sessionStorage.setItem('lawdesk_intake_uploaded_files', JSON.stringify(readableFiles))
      sessionStorage.setItem('new_matter_draft', JSON.stringify(draft))
      setFiles(readableFiles)
      setReceivedConfirmed(true)
      setErrorMessage(null)
    } catch {
      sessionStorage.removeItem('lawdesk_intake_uploaded_files')
      sessionStorage.removeItem('new_matter_draft')
      setFiles([])
      setReceivedConfirmed(false)
      setErrorMessage('无法保存上传结果，请重新上传')
    }
  }

  async function handleStart() {
    setErrorMessage(null)
    if (files.length === 0 || !files.every(isUploadedFile)) {
      setErrorMessage('请先成功上传咨询资料，再开始 AI 分析')
      return
    }

    try {
      const draft = { caseName: '', client: '', opponent: '', caseType: '', files }
      sessionStorage.setItem('new_matter_draft', JSON.stringify(draft))
      sessionStorage.setItem('lawdesk_intake_uploaded_files', JSON.stringify(files))
      router.push('/intake/analyzing')
    } catch {
      setErrorMessage('无法保存上传结果，请重试')
    }
  }

  const canStartAnalysis = files.length > 0 && files.every(isUploadedFile)

  return (
    <main style={{ padding: 24 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>上传咨询资料</h2>
        <div style={{ color: '#6b7280', lineHeight: 1.7, marginBottom: 18 }}>
          AI 将根据上传材料自动生成案件名称、当事人和案件类型，律师审核后建立案件。
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>已上传文件</div>

            <Uploader matterId={derivedMatterId || undefined} onUploaded={saveValidatedUpload} />

            {receivedConfirmed && files.length > 0 && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 8, border: '1px solid #f1f5f9', background: '#ffffff', color: '#111827' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>资料已接收</div>
                <div style={{ color: '#6b7280', marginBottom: 8 }}>已上传文件：{files.length} 个</div>
                <div style={{ color: '#6b7280', marginBottom: 12 }}>最近上传时间：{files.length > 0 ? new Date(files.reduce((a, b) => (new Date(a.upload_time) > new Date(b.upload_time) ? a : b)).upload_time).toLocaleString() : '-'}</div>
                <div style={{ textAlign: 'right' }}>
                  <button disabled={!canStartAnalysis} onClick={handleStart} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: canStartAnalysis ? '#111827' : '#94a3b8', color: '#fff', fontWeight: 700 }}>开始 AI 分析</button>
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
            <button disabled={!canStartAnalysis} onClick={handleStart} style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: canStartAnalysis ? '#2563eb' : '#94a3b8', color: '#fff', fontWeight: 600 }}>开始 AI 分析</button>
            {errorMessage ? <div style={{ marginTop: 8, color: '#b91c1c' }}>{errorMessage}</div> : null}
          </div>
        </div>
      </div>
    </main>
  )
}
