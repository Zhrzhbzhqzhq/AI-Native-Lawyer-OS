"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Workspace = {
  matter: { matter_id: string; title?: string; status?: string }
  summary: { materials: number; evidence: number; documents: number; pending_ai_suggestions: number }
  recent_materials: any[]
  recent_evidence: any[]
  recent_documents: any[]
  recent_activity?: any[]
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
  const [runtime, setRuntime] = useState<any | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
        const [res, resRuntime] = await Promise.all([
          fetch(`${API}/matters/${params.matter_id}/workspace`),
          fetch(`${API}/matters/${params.matter_id}/runtime`).catch(() => null),
        ])

        if (!res.ok) throw new Error('workspace fetch failed')
        const body = await res.json()
        setData(body as Workspace)

        if (resRuntime && resRuntime.ok) {
          try {
            const rt = await resRuntime.json()
            setRuntime(rt)
          } catch (_e) {
            setRuntime(null)
          }
        } else {
          setRuntime(null)
        }
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
  const recentActivity = (data as any).recent_activity ?? []
  const aiNextSteps = (data as any).ai_next_steps ?? []

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
        <div style={{ padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #e6edf0', minWidth: 220 }}>
          <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>AI Chief</div>
          {runtime && runtime.runtime_plan ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{runtime.runtime_plan.goal || 'No runtime plan yet'}</div>
              <div style={{ color: '#666', fontSize: 12, marginTop: 6 }}>Priority: {runtime.runtime_plan.priority || '—'}</div>
              <div style={{ color: '#666', fontSize: 12, marginTop: 6 }}>Decision: {runtime.runtime_decision?.code || '—'}</div>
              <div style={{ color: '#475569', fontSize: 13, marginTop: 8 }}>Recommended: {runtime.runtime_plan.steps && runtime.runtime_plan.steps.length > 0 ? runtime.runtime_plan.steps[0] : 'No recommendation'}</div>
              <div style={{ color: '#666', fontSize: 12, marginTop: 6 }}>Ready actions: {(Array.isArray(runtime.runtime_actions) ? runtime.runtime_actions.filter((a:any)=>a.status==='READY').length : 0)}</div>
            </div>
          ) : (
            <div style={{ marginTop: 8, color: '#666' }}>No runtime plan yet</div>
          )}
        </div>
      </div>

      {Array.isArray((data as any).object_navigation) && (
        <div style={{ marginTop: 16 }}>
          <h3>Workspace Objects</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            {(data as any).object_navigation.map((obj: any) => (
              <div key={obj.key} style={{ padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #e6edf0', minWidth: 180 }}>
                <div style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>{obj.label}</div>
                <div style={{ color: '#666', marginTop: 6 }}>{obj.description}</div>
                <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{obj.count}</div>
                <div style={{ marginTop: 8 }}><a href={obj.href}>{obj.href}</a></div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      <div style={{ marginTop: 16 }}>
      <h3>Recent Activity</h3>
      {recentActivity.length > 0 ? (
        <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
          {recentActivity.map((a:any, idx:number) => (
            <div key={idx} style={{ padding: '8px 0', borderBottom: idx === recentActivity.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
              <div style={{ fontWeight: 600 }}>{a.title}</div>
              <div style={{ color: '#666' }}>{a.description}</div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>{new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: '#666' }}>No recent activity</div>
      )}
    </div>

      <div style={{ marginTop: 20 }}>
        <h3>AI Next Step</h3>
        {aiNextSteps.length > 0 ? (
          <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
            {aiNextSteps.map((s:any, idx:number) => (
              <div key={s.id ?? idx} style={{ padding: '8px 0', borderBottom: idx === aiNextSteps.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: 600 }}>{s.title}</div>
                <div style={{ color: '#666' }}>{s.description}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: '#475569' }}>Priority: {s.priority} · Action: {s.action}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{s.reason}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#666' }}>No AI next steps</div>
        )}
      </div>
    </main>
  )
}
