"use client"

import React, { useMemo, useRef, useState, useEffect } from 'react'

type Matter = {
  matter_id: string
  title: string
}

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
  const [source, setSource] = useState<'client' | 'opponent' | 'court' | 'third_party'>('client')
  const [drafts, setDrafts] = useState<any[] | null>(null)
  const [matterId, setMatterId] = useState('')
  const [matterQuery, setMatterQuery] = useState('')
  const [matters, setMatters] = useState<Matter[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<IntakeResponse | null>(null)
  const [confirmResult, setConfirmResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [challengeResult, setChallengeResult] = useState<any | null>(null)
  const [createdDocuments, setCreatedDocuments] = useState<any[] | null>(null)
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

  async function handleConfirmMaterials() {
    setError(null)
    if (!result || !result.analysis) {
      setError('No analysis to confirm')
      return
    }
    if (!matterId) {
      setError('Please provide a matter_id before confirming')
      return
    }

    try {
      const mapSource = (s: string) => {
        // UI uses client/opponent/court/third_party
        if (s === 'client') return 'client'
        if (s === 'opponent') return 'opponent'
        if (s === 'court') return 'court'
        return 'third_party'
      }

      const payload = {
        matter_id: matterId,
        source: mapSource(source),
        files: files.map((f) => ({ name: f.name, mime_type: f.type })),
        analysis: { summary: result.analysis.summary, material_suggestions: result.analysis.material_suggestions ?? [] },
      }

      const res = await fetch(`${API}/intake/confirm-material`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || 'confirm failed')
      }
      const body = await res.json()
      setConfirmResult(body)
    } catch (e: any) {
      setError(e?.message || 'Confirm failed')
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
            <option value="client">我方材料</option>
            <option value="opponent">对方材料</option>
            <option value="court">法院材料</option>
            <option value="third_party">第三方材料</option>
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

                <div style={{ marginTop: 8, fontWeight: 700 }}>材料来源类型</div>
                <div>
                  {source === 'client' ? '我方材料' : source === 'opponent' ? '对方材料' : source === 'court' ? '法院材料' : '第三方材料'}
                </div>

                {source === 'opponent' && (
                  <div style={{ marginTop: 10, padding: 10, background: '#fff1f2', color: '#b91c1c', borderRadius: 8 }}>
                    这是对方材料，后续将进入质证意见流程。
                  </div>
                )}

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
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={handleConfirmMaterials}
                    style={{ marginTop: 6, padding: '8px 12px', borderRadius: 8, background: '#0ea5a4', color: '#fff', border: 'none' }}
                  >
                    确认并归档为材料
                  </button>
                </div>
                {confirmResult && (
                  <div style={{ marginTop: 12, background: '#fff', padding: 10, borderRadius: 8 }}>
                    <div><strong>status:</strong> {String(confirmResult.status)}</div>
                    <div><strong>created:</strong> {Array.isArray(confirmResult.created_materials) ? confirmResult.created_materials.length : 0}</div>
                    <div style={{ marginTop: 8 }}>
                      {Array.isArray(confirmResult.created_materials) && confirmResult.created_materials.map((m: any) => (
                        <div key={m.material_id} style={{ padding: 6, borderBottom: '1px solid #eee' }}>
                          <div><strong>{m.title}</strong></div>
                          <div style={{ color: '#6b7280' }}>{m.material_id}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {drafts && (
                  <div style={{ marginTop: 12, background: '#fff', padding: 10, borderRadius: 8 }}>
                    <div style={{ fontWeight: 700 }}>Evidence Drafts</div>
                    <div style={{ marginTop: 8 }}>
                      {drafts.map((d: any) => (
                        <div key={d.draft_id} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                          <div><strong>{d.title}</strong></div>
                          <div>proof_purpose: {d.proof_purpose}</div>
                          <div>confidence: {d.confidence}</div>
                          <div>suggested_action: {d.suggested_action}</div>
                          <div>来源: {d.source === 'client' ? '我方材料' : d.source === 'opponent' ? '对方材料' : d.source === 'court' ? '法院材料' : '第三方材料'}</div>
                          {d.source === 'opponent' && (
                            <div style={{ marginTop: 6, color: '#b91c1c' }}>建议后续生成质证意见草稿</div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Generate challenge drafts button for opponent drafts */}
                    {drafts.some((dd: any) => dd.source === 'opponent') && (
                      <div style={{ marginTop: 12 }}>
                        <button
                          type="button"
                          onClick={async () => {
                            setError(null)
                            setChallengeResult(null)
                            if (!matterId) {
                              setError('Please select matter_id before generating challenge drafts')
                              return
                            }
                            const opponentDrafts = drafts.filter((dd: any) => dd.source === 'opponent')
                            try {
                              const res = await fetch(`${API}/intake/challenge-draft`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ matter_id: matterId, evidence_drafts: opponentDrafts }),
                              })
                              if (!res.ok) {
                                const t = await res.text().catch(() => '')
                                throw new Error(t || 'challenge failed')
                              }
                              const body = await res.json()
                              setChallengeResult(body)
                            } catch (e: any) {
                              setError(e?.message || 'Challenge draft failed')
                            }
                          }}
                          style={{ marginTop: 6, padding: '8px 12px', borderRadius: 8, background: '#7c3aed', color: '#fff', border: 'none' }}
                        >
                          生成质证意见草稿
                        </button>
                      </div>
                    )}

                    {challengeResult && (
                      <div style={{ marginTop: 12, background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                        <div><strong>status:</strong> {challengeResult.status}</div>
                        <div><strong>matter_id:</strong> {challengeResult.matter_id}</div>
                        <div><strong>drafts:</strong> {Array.isArray(challengeResult.challenge_opinion_drafts) ? challengeResult.challenge_opinion_drafts.length : 0}</div>
                        <div style={{ marginTop: 8 }}>
                          {Array.isArray(challengeResult.challenge_opinion_drafts) && challengeResult.challenge_opinion_drafts.map((c: any) => (
                            <div key={c.draft_id} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                              <div><strong>{c.title}</strong></div>
                              <div>真实性: {c.challenge_points?.authenticity}</div>
                              <div>合法性: {c.challenge_points?.legality}</div>
                              <div>关联性: {c.challenge_points?.relevance}</div>
                              <div>证明力: {c.challenge_points?.probative_force}</div>
                              <div>建议意见: {c.suggested_opinion}</div>
                              {c.requires_lawyer_confirmation && <div style={{ color: '#b91c1c' }}>需律师确认</div>}
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <button
                            type="button"
                            onClick={async () => {
                              setError(null)
                              setCreatedDocuments(null)
                              if (!matterId) {
                                setError('Please select matter_id before confirming documents')
                                return
                              }
                              const drafts = Array.isArray(challengeResult.challenge_opinion_drafts) ? challengeResult.challenge_opinion_drafts : []
                              try {
                                const res = await fetch(`${API}/intake/confirm-challenge-document`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ matter_id: matterId, challenge_opinion_drafts: drafts }),
                                })
                                if (!res.ok) {
                                  const t = await res.text().catch(() => '')
                                  throw new Error(t || 'confirm document failed')
                                }
                                const body = await res.json()
                                setCreatedDocuments(Array.isArray(body.created_documents) ? body.created_documents : [])
                              } catch (e: any) {
                                setError(e?.message || 'Confirm document failed')
                              }
                            }}
                            style={{ marginTop: 6, padding: '8px 12px', borderRadius: 8, background: '#0369a1', color: '#fff', border: 'none' }}
                          >
                            确认生成质证意见文书
                          </button>
                        </div>

                        {createdDocuments && (
                          <div style={{ marginTop: 8, background: '#fff', padding: 8, borderRadius: 8 }}>
                            <div><strong>created_documents:</strong> {createdDocuments.length}</div>
                            {createdDocuments.map((doc: any) => (
                              <div key={doc.document_id} style={{ padding: 6, borderBottom: '1px solid #eee' }}>
                                <div><strong>{doc.title}</strong></div>
                                <div>id: {doc.document_id}</div>
                                <div>type: {doc.document_type}</div>
                                <div>version: {doc.version}</div>
                                <div>status: {doc.status}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirmResult || !Array.isArray(confirmResult.created_materials)) return
                      const mats = confirmResult.created_materials.map((m: any) => ({ material_id: m.material_id, title: m.title, material_type: m.material_type, source: m.source }))
                      try {
                        const res = await fetch(`${API}/intake/evidence-draft`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ matter_id: matterId, materials: mats }),
                        })
                        if (!res.ok) throw new Error('draft failed')
                        const body = await res.json()
                        setDrafts(Array.isArray(body.evidence_drafts) ? body.evidence_drafts : [])
                      } catch (e) {
                        alert(String(e))
                      }
                    }}
                    style={{ marginTop: 6, padding: '8px 12px', borderRadius: 8, background: '#f97316', color: '#fff', border: 'none' }}
                  >
                    生成证据草稿
                  </button>
                </div>
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirmResult || !Array.isArray(confirmResult.created_materials)) return
                        const mats = confirmResult.created_materials.map((m: any) => ({ material_id: m.material_id, title: m.title, material_type: m.material_type, source: m.source }))
                        try {
                          const draftRes = await fetch(`${API}/intake/evidence-draft`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ matter_id: matterId, materials: mats }),
                          })
                          if (!draftRes.ok) throw new Error('draft failed')
                          const draftBody = await draftRes.json()

                          setDrafts(Array.isArray(draftBody.evidence_drafts) ? draftBody.evidence_drafts : [])

                          const confirmRes = await fetch(`${API}/intake/confirm-evidence`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ matter_id: matterId, evidence_drafts: draftBody.evidence_drafts }),
                          })
                          if (!confirmRes.ok) throw new Error('confirm evidence failed')
                          const confirmBody = await confirmRes.json()
                          alert(`Created evidence: ${Array.isArray(confirmBody.created_evidence) ? confirmBody.created_evidence.length : 0}`)
                        } catch (e) {
                          alert(String(e))
                        }
                      }}
                      style={{ marginTop: 6, padding: '8px 12px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none' }}
                    >
                      确认生成正式证据
                    </button>
                  </div>
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