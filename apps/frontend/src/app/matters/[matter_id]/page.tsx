"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Workspace = {
  matter: { matter_id: string; title?: string; status?: string }
  summary: { materials: number; evidence: number; documents: number; pending_ai_suggestions: number }
  recent_materials: any[]
  recent_evidence: any[]
  recent_documents: any[]
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div style={{ padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #e6edf0', minWidth: 140 }}>
      <div style={{ fontSize: 12, color: '#475569' }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function RecentList({ title, items, renderItem }: { title: string; items: any[]; renderItem: (it: any) => React.ReactNode }) {
  return (
    <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {items.length === 0 && <div style={{ color: '#666' }}>No {title.toLowerCase()}</div>}
      {items.map((it, idx) => (
        <div key={it.material_id ?? it.evidence_id ?? it.document_id ?? idx} style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
          {renderItem(it)}
        </div>
      ))}
    </div>
  )
}

export default function MatterWorkspacePage() {
  const params = useParams() as { matter_id: string }
  const [data, setData] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
        const res = await fetch(`${API}/matters/${params.matter_id}/workspace`)
        if (!res.ok) throw new Error('workspace fetch failed')
        const body = await res.json()
        setData(body as Workspace)
      } catch (e: any) {
        setError(e?.message || 'Failed to load workspace')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.matter_id])

  if (loading) return <main style={{ padding: 24 }}><div>Loading workspace...</div></main>
  if (error) return <main style={{ padding: 24 }}><div style={{ color: '#b91c1c' }}>Error: {error}</div></main>
  if (!data) return null

  const matter = data.matter || { matter_id: params.matter_id, title: '', status: '' }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ padding: 20, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <h1 style={{ margin: 0 }}>{matter.title || 'Untitled Matter'}</h1>
        <div style={{ color: '#666', marginTop: 6 }}>{matter.matter_id} · {matter.status}</div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <SummaryCard title="Materials" value={data.summary.materials} />
        <SummaryCard title="Evidence" value={data.summary.evidence} />
        <SummaryCard title="Documents" value={data.summary.documents} />
        <SummaryCard title="AI Suggestions" value={data.summary.pending_ai_suggestions} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
        <RecentList title="Recent Materials" items={data.recent_materials} renderItem={(m:any)=> (
          <>
            <div style={{ fontWeight: 600 }}>{m.title || m.name || 'Untitled'}</div>
            <div style={{ color: '#666', fontSize: 12 }}>{m.material_type || m.source || ''}</div>
          </>
        )} />

        <RecentList title="Recent Evidence" items={data.recent_evidence} renderItem={(e:any)=> (
          <>
            <div style={{ fontWeight: 600 }}>{e.title || 'Untitled'}</div>
            <div style={{ color: '#666', fontSize: 12 }}>{e.evidence_type || ''}</div>
          </>
        )} />

        <RecentList title="Recent Documents" items={data.recent_documents} renderItem={(d:any)=> (
          <>
            <div style={{ fontWeight: 600 }}>{d.title || 'Untitled'}</div>
            <div style={{ color: '#666', fontSize: 12 }}>{d.document_type || ''} · {d.version || ''}</div>
          </>
        )} />
      </div>

      <div style={{ marginTop: 20, padding: 12, color: '#94a3b8' }}>AI Next Step（Coming Soon）</div>
    </main>
  )
}
