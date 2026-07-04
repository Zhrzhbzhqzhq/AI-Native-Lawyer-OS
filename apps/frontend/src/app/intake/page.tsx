"use client"

import React, { useMemo, useRef, useState, useEffect } from 'react'

type Matter = {
  matter_id: string
  title: string
}

type IntakeResponse = {
  job_id: string
  status: string
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
  const [source, setSource] = useState<'Plaintiff' | 'Opponent' | 'Court' | 'Third Party'>('Plaintiff')
  const [matterId, setMatterId] = useState('')
  const [matterQuery, setMatterQuery] = useState('')
  const [matters, setMatters] = useState<Matter[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<IntakeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(`${API}/matters`)
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        const mapped = Array.isArray(data)
          ? data.map((m: any) => ({ matter_id: String(m.matter_id), title: String(m.title || '') }))
          : []
        setMatters(mapped)
      } catch (_e) {
        // Keep page usable even if matter list is temporarily unavailable.
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const filteredMatters = useMemo(() => {
    const q = matterQuery.trim().toLowerCase()
    if (!q) return matters.slice(0, 8)
    return matters
      .filter((m) => m.matter_id.toLowerCase().includes(q) || m.title.toLowerCase().includes(q))
      .slice(0, 8)
  }, [matters, matterQuery])

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
    if (e.dataTransfer?.files?.length) {
      mergeFiles(e.dataTransfer.files)
    }
  }

  async function handleStartAnalysis() {
    setError(null)
    setResult(null)

    if (files.length === 0) {
      setError('Please add at least one file.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
        matter_id: matterId.trim() ? matterId.trim() : undefined,
        source,
      }

      const res = await fetch(`${API}/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const msg = await res.text().catch(() => 'Request failed')
        throw new Error(msg || 'Request failed')
      }

      const body = (await res.json()) as IntakeResponse
      setResult(body)
    } catch (e: any) {
      setError(e?.message || 'Start analysis failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>Unified Intake Workspace</h1>

      <section style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div
          onDragEnter={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault()
            setDragActive(false)
          }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? '#2563eb' : '#cbd5e1'}`,
            borderRadius: 12,
            padding: 24,
            textAlign: 'center',
            background: dragActive ? '#eff6ff' : '#f8fafc',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontWeight: 600 }}>Drag & Drop files here</div>
          <div style={{ color: '#475569', marginTop: 6 }}>Multiple files supported</div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.length) mergeFiles(e.target.files)
            }}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Selected Files</div>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, minHeight: 60 }}>
            {files.length === 0 ? (
              <div style={{ color: '#64748b' }}>No files selected.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {files.map((f) => (
                  <li key={`${f.name}:${f.size}:${f.lastModified}`}>{f.name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Matter</div>
          <input
            value={matterQuery}
            onChange={(e) => setMatterQuery(e.target.value)}
            placeholder="Search matter by id or title"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
          />
          <div style={{ marginTop: 8, background: '#f8fafc', borderRadius: 8, maxHeight: 160, overflow: 'auto', padding: 8 }}>
            {filteredMatters.map((m) => (
              <div
                key={m.matter_id}
                onClick={() => setMatterId(m.matter_id)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: matterId === m.matter_id ? '#dbeafe' : 'transparent',
                }}
              >
                {m.matter_id} - {m.title}
              </div>
            ))}
          </div>
          <input
            value={matterId}
            onChange={(e) => setMatterId(e.target.value)}
            placeholder="matter_id (optional)"
            style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Source</div>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as any)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
          >
            <option value="Plaintiff">Plaintiff（我方）</option>
            <option value="Opponent">Opponent（对方）</option>
            <option value="Court">Court（法院）</option>
            <option value="Third Party">Third Party（第三方）</option>
          </select>
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={submitting}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 10,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Starting...' : 'Start Analysis'}
          </button>
        </div>

        {result && (
          <div style={{ marginTop: 12, color: '#0f766e' }}>
            <div>job_id: {result.job_id} | status: {result.status}</div>
            {result.analysis && (
              <div style={{ marginTop: 8, background: '#f1f5f9', padding: 12, borderRadius: 8 }}>
                <div style={{ fontWeight: 700 }}>AI Summary</div>
                <div style={{ marginTop: 6 }}>{result.analysis.summary}</div>

                <div style={{ marginTop: 10, fontWeight: 700 }}>Detected Matter</div>
                <div>
                  {result.analysis.detected_matter.matter_id || 'N/A'} (confidence:{' '}
                  {result.analysis.detected_matter.confidence})
                </div>

                <div style={{ marginTop: 10, fontWeight: 700 }}>Material Suggestions</div>
                <div>{Array.isArray(result.analysis.material_suggestions) ? 'No suggestions' : ''}</div>

                <div style={{ marginTop: 10, fontWeight: 700 }}>Evidence Suggestions</div>
                <div>{Array.isArray(result.analysis.evidence_suggestions) ? 'No suggestions' : ''}</div>

                <div style={{ marginTop: 10, fontWeight: 700 }}>Document Suggestions</div>
                <div>{Array.isArray(result.analysis.document_suggestions) ? 'No suggestions' : ''}</div>

                <div style={{ marginTop: 10, fontWeight: 700 }}>Next Actions</div>
                <div>{Array.isArray(result.analysis.next_actions) ? 'No suggestions' : ''}</div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, color: '#b91c1c' }}>{error}</div>
        )}
      </section>
    </main>
  )
}