"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type DocumentWorkspace = {
  matter: { matter_id: string; title?: string; status?: string }
  summary: { total: number; completed: number; draft: number; need_review: number; missing: number }
  document_list: Array<any>
  selected_document: any | null
  ai_analysis: { status: string; message: string }
  missing_documents: Array<any>
  document_next_steps: Array<any>
  navigation?: { by_type: Array<any>, by_status: Array<any>, by_version: Array<any> }
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div style={{ padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #e6edf0', minWidth: 120 }}>
      <div style={{ fontSize: 12, color: '#475569' }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

export default function DocumentWorkspacePage() {
  const params = useParams() as { matter_id: string }
  const [data, setData] = useState<DocumentWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
        const res = await fetch(`${API}/matters/${params.matter_id}/documents/workspace`)
        if (!res.ok) throw new Error('failed to load')
        const body = await res.json()
        setData(body as DocumentWorkspace)
      } catch (e: any) {
        setError(e?.message || 'Failed')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.matter_id])

  if (loading) return <main style={{ padding: 24 }}><div>Loading Document Workspace...</div></main>
  if (error) return <main style={{ padding: 24 }}><div style={{ color: '#b91c1c' }}>Error: {error}</div></main>
  if (!data) return null

  const matter = data.matter || { matter_id: params.matter_id, title: '', status: '' }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ padding: 20, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <h1 style={{ margin: 0 }}>Document Workspace</h1>
        <div style={{ color: '#666', marginTop: 6 }}>{matter.title} · {matter.status}</div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <SummaryCard title="Total" value={data.summary.total} />
        <SummaryCard title="Completed" value={data.summary.completed} />
        <SummaryCard title="Draft" value={data.summary.draft} />
        <SummaryCard title="Need Review" value={data.summary.need_review} />
        <SummaryCard title="Missing" value={data.summary.missing} />
      </div>

      {data && (data as any).navigation && (
        <div style={{ marginTop: 16 }}>
          <h3>Document Navigation</h3>
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
              <div style={{ fontWeight: 700 }}>By Version</div>
              {((data as any).navigation.by_version || []).map((it:any) => (
                <div key={it.key} style={{ padding: 6 }}>{it.label} · {it.count} <div style={{ color: '#666' }}>{it.description}</div></div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginTop: 16 }}>
        <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Document List</h3>
          {data.document_list.length === 0 && <div style={{ color: '#666' }}>No documents</div>}
          {data.document_list.map((d:any) => (
            <div key={d.document_id} style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontWeight: 600 }}>{d.title}</div>
              <div style={{ color: '#666', fontSize: 12 }}>{d.document_type} · v{d.version || '1'}</div>
              <div style={{ fontSize: 12, color: '#475569' }}>{d.status} · {d.updated_at}</div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Document Detail</h3>
            <div style={{ color: '#666' }}>Select a document item to view details</div>
          </div>

          <div style={{ marginTop: 12, background: '#fff', padding: 12, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>AI Analysis</h3>
            <div style={{ color: '#666' }}>{data.ai_analysis?.message ?? 'AI document analysis coming soon'}</div>
          </div>

          <div style={{ marginTop: 12, background: '#fff', padding: 12, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Missing Documents</h3>
            {Array.isArray(data.missing_documents) && data.missing_documents.length === 0 ? (
              <div style={{ color: '#666' }}>No missing document suggestions yet</div>
            ) : (
              data.missing_documents.map((m:any, idx:number) => (
                <div key={idx} style={{ padding: 6 }}>{m.description || m.title}</div>
              ))
            )}
          </div>

          <div style={{ marginTop: 12, background: '#fff', padding: 12, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Document Next Step</h3>
            {Array.isArray(data.document_next_steps) && data.document_next_steps.length === 0 ? (
              <div style={{ color: '#666' }}>No document next steps</div>
            ) : (
              data.document_next_steps.map((s:any, idx:number) => (
                <div key={idx} style={{ padding: 6 }}>{s.title}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
