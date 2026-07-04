"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type EvidenceWorkspace = {
  matter: { matter_id: string; title?: string; status?: string }
  summary: { total: number; accepted: number; pending: number; weak: number; missing: number }
  evidence_list: Array<any>
  selected_evidence: any | null
  ai_analysis: { status: string; message: string }
  missing_evidence: Array<any>
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div style={{ padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #e6edf0', minWidth: 120 }}>
      <div style={{ fontSize: 12, color: '#475569' }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

export default function EvidenceWorkspacePage() {
  const params = useParams() as { matter_id: string }
  const [data, setData] = useState<EvidenceWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
        const res = await fetch(`${API}/matters/${params.matter_id}/evidence/workspace`)
        if (!res.ok) throw new Error('failed to load')
        const body = await res.json()
        setData(body as EvidenceWorkspace)
      } catch (e: any) {
        setError(e?.message || 'Failed')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.matter_id])

  if (loading) return <main style={{ padding: 24 }}><div>Loading Evidence Workspace...</div></main>
  if (error) return <main style={{ padding: 24 }}><div style={{ color: '#b91c1c' }}>Error: {error}</div></main>
  if (!data) return null

  const matter = data.matter || { matter_id: params.matter_id, title: '', status: '' }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ padding: 20, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <h1 style={{ margin: 0 }}>Evidence Workspace</h1>
        <div style={{ color: '#666', marginTop: 6 }}>{matter.title} · {matter.status}</div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <SummaryCard title="Total" value={data.summary.total} />
        <SummaryCard title="Accepted" value={data.summary.accepted} />
        <SummaryCard title="Pending" value={data.summary.pending} />
        <SummaryCard title="Weak" value={data.summary.weak} />
        <SummaryCard title="Missing" value={data.summary.missing} />
      </div>

      {data && (data as any).navigation && (
        <div style={{ marginTop: 16 }}>
          <h3>Evidence Navigation</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
              <div style={{ fontWeight: 700 }}>By Type</div>
              {((data as any).navigation.by_type || []).map((it:any) => (
                <div key={it.key} style={{ padding: 6 }}>{it.label} · {it.count} <div style={{ color: '#666' }}>{it.description}</div></div>
              ))}
            </div>
            <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
              <div style={{ fontWeight: 700 }}>By Status</div>
              {((data as any).navigation.by_status || []).map((it:any) => (
                <div key={it.key} style={{ padding: 6 }}>{it.label} · {it.count} <div style={{ color: '#666' }}>{it.description}</div></div>
              ))}
            </div>
            <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
              <div style={{ fontWeight: 700 }}>By Strength</div>
              {((data as any).navigation.by_strength || []).map((it:any) => (
                <div key={it.key} style={{ padding: 6 }}>{it.label} · {it.count} <div style={{ color: '#666' }}>{it.description}</div></div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginTop: 16 }}>
        <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Evidence List</h3>
          {data.evidence_list.length === 0 && <div style={{ color: '#666' }}>No evidence</div>}
          {data.evidence_list.map((e:any) => (
            <div key={e.evidence_id} style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontWeight: 600 }}>{e.title}</div>
              <div style={{ color: '#666', fontSize: 12 }}>{e.evidence_type} · {e.source}</div>
              <div style={{ fontSize: 12, color: '#475569' }}>{e.status} · relevance: {e.relevance}</div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Evidence Detail</h3>
            {data.selected_evidence ? (
              <div>
                <h2 style={{ margin: '6px 0' }}>{data.selected_evidence.title}</h2>
                <div style={{ color: '#666', fontSize: 13 }}>ID: {data.selected_evidence.evidence_id}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <div style={{ fontSize: 13 }}>Type: {data.selected_evidence.evidence_type}</div>
                  <div style={{ fontSize: 13 }}>Status: {data.selected_evidence.status}</div>
                  <div style={{ fontSize: 13 }}>Relevance: {data.selected_evidence.relevance}</div>
                </div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>Source: {data.selected_evidence.source}</div>
                <div style={{ fontSize: 13, color: '#666' }}>Updated: {data.selected_evidence.updated_at ?? 'N/A'}</div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 700 }}>Description</div>
                  <div style={{ color: '#333' }}>{data.selected_evidence.description || 'No description'}</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 700 }}>Related Material</div>
                  {data.selected_evidence.related_material ? (
                    <div style={{ color: '#333' }}>{data.selected_evidence.related_material.title} · {data.selected_evidence.related_material.material_id}</div>
                  ) : (
                    <div style={{ color: '#666' }}>No related material</div>
                  )}
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 700 }}>AI Summary</div>
                  <div style={{ color: '#666' }}>{data.selected_evidence.ai_summary?.message || 'AI evidence summary coming soon'}</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 700 }}>Related Documents</div>
                  {Array.isArray(data.selected_evidence.related_documents) && data.selected_evidence.related_documents.length === 0 ? (
                    <div style={{ color: '#666' }}>No related documents</div>
                  ) : (
                    (data.selected_evidence.related_documents || []).map((d:any, idx:number) => (
                      <div key={idx} style={{ padding: 6 }}>{d.title || d.document_id}</div>
                    ))
                  )}
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 700 }}>Timeline</div>
                  {Array.isArray(data.selected_evidence.related_timeline) && data.selected_evidence.related_timeline.length === 0 ? (
                    <div style={{ color: '#666' }}>No related timeline events</div>
                  ) : (
                    (data.selected_evidence.related_timeline || []).map((t:any, idx:number) => (
                      <div key={idx} style={{ padding: 6 }}>{t.event_type || t.timeline_id}</div>
                    ))
                  )}
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 700 }}>Lawyer Notes</div>
                  <div style={{ color: '#666' }}>{data.selected_evidence.lawyer_notes?.message || 'Lawyer notes coming soon'}</div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#666' }}>Select an evidence item to view details</div>
            )}
          </div>

          <div style={{ marginTop: 12, background: '#fff', padding: 12, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>AI Analysis</h3>
            {/* Render new rule-based ai_summary when available on selected_evidence, otherwise fallback */}
            {data.selected_evidence && data.selected_evidence.ai_summary && data.selected_evidence.ai_summary.status === 'rule_based' ? (
              <div>
                <div style={{ fontWeight: 700 }}>Score: {data.selected_evidence.ai_summary.score}</div>
                <div style={{ color: '#666' }}>Completeness: {data.selected_evidence.ai_summary.completeness}</div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 700 }}>Strengths</div>
                  {Array.isArray(data.selected_evidence.ai_summary.strengths) && data.selected_evidence.ai_summary.strengths.length > 0 ? (
                    data.selected_evidence.ai_summary.strengths.map((s:any, idx:number) => <div key={idx}>{s}</div>)
                  ) : (
                    <div style={{ color: '#666' }}>No strengths</div>
                  )}
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 700 }}>Risks</div>
                  {Array.isArray(data.selected_evidence.ai_summary.risks) && data.selected_evidence.ai_summary.risks.length > 0 ? (
                    data.selected_evidence.ai_summary.risks.map((r:any, idx:number) => <div key={idx} style={{ color: '#b91c1c' }}>{r}</div>)
                  ) : (
                    <div style={{ color: '#666' }}>No risks</div>
                  )}
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 700 }}>Recommendations</div>
                  {Array.isArray(data.selected_evidence.ai_summary.recommendations) && data.selected_evidence.ai_summary.recommendations.length > 0 ? (
                    data.selected_evidence.ai_summary.recommendations.map((r:any, idx:number) => <div key={idx}>{r}</div>)
                  ) : (
                    <div style={{ color: '#666' }}>No recommendations</div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ color: '#666' }}>{data.ai_analysis?.message ?? 'AI evidence analysis coming soon'}</div>
            )}
          </div>

          <div style={{ marginTop: 12, background: '#fff', padding: 12, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Missing Evidence</h3>
            {Array.isArray(data.missing_evidence) && data.missing_evidence.length === 0 ? (
              <div style={{ color: '#666' }}>No missing evidence suggestions yet</div>
            ) : (
              data.missing_evidence.map((m:any, idx:number) => (
                <div key={idx} style={{ padding: 6 }}>{m.description || m.type}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
