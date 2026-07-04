"use client"
import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'

function RuntimeSummaryPanel({ matterId }: { matterId: string }) {
  const [runtime, setRuntime] = useState<any | null>(null)
  const [director, setDirector] = useState<any | null>(null)
  const [events, setEvents] = useState<any[] | null>(null)
  const [proposals, setProposals] = useState<any[] | null>(null)

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
    async function load() {
      try {
        const [rResp, dResp, eResp, pResp] = await Promise.all([
          fetch(`${API}/matters/${matterId}/runtime`).then((r)=>r.ok? r.json(): null).catch(()=>null),
          fetch(`${API}/matters/${matterId}/director`).then((r)=>r.ok? r.json(): null).catch(()=>null),
          fetch(`${API}/matters/${matterId}/events`).then((r)=>r.ok? r.json(): []).catch(()=>[]),
          fetch(`${API}/matters/${matterId}/action-proposals`).then((r)=>r.ok? r.json(): []).catch(()=>[]),
        ])
        setRuntime(rResp)
        setDirector(dResp)
        setEvents(Array.isArray(eResp) ? eResp.slice(-3).reverse() : [])
        setProposals(Array.isArray(pResp) ? pResp : [])
      } catch (e) {
        console.error('RuntimeSummary load error', e)
      }
    }
    load()
  }, [matterId])

  const panelStyle: React.CSSProperties = { padding: 12, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 16 }
  const card: React.CSSProperties = { display: 'inline-block', verticalAlign: 'top', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginRight: 12, minWidth: 180 }

  const pending = Array.isArray(proposals) ? proposals.filter(p=>p.status==='pending') : []
  const latestPending = pending.length ? pending[pending.length-1].title : '—'

  return (
    <div style={panelStyle} id="runtime-summary-panel">
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={card} id="rs-health">
          <div style={{ fontSize: 12, color: '#334155' }}>Health</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{runtime?.ai?.intelligence?.health?.score ?? '—'}</div>
          <div style={{ color: '#475569' }}>{runtime?.ai?.intelligence?.health?.status ?? '—'}</div>
        </div>

        <div style={card} id="rs-workflow">
          <div style={{ fontSize: 12, color: '#334155' }}>Workflow</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{runtime?.workflow?.current_stage ?? '—'}</div>
          <div style={{ color: '#475569' }}>Completion: {runtime?.workflow?.completion ?? '—'}</div>
          <div style={{ color: '#475569' }}>Next: {runtime?.workflow?.next_step ?? '—'}</div>
        </div>

        <div style={card} id="rs-director">
          <div style={{ fontSize: 12, color: '#334155' }}>Director Decision</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{director?.decision?.type ?? '—'}</div>
          <div style={{ color: '#475569' }}>{director?.decision?.reason ?? '—'}</div>
          <div style={{ color: '#475569' }}>Next: {director?.decision?.recommended_next ?? '—'}</div>
        </div>

        <div style={card} id="rs-proposals">
          <div style={{ fontSize: 12, color: '#334155' }}>Pending Proposals</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{pending.length}</div>
          <div style={{ color: '#475569' }}>{latestPending}</div>
        </div>

        <div style={{ flex: 1, borderRadius: 8, padding: 8, border: '1px solid #e2e8f0' }} id="rs-events">
          <div style={{ fontSize: 12, color: '#334155' }}>Recent Events</div>
          <div style={{ marginTop: 8 }}>
            {events && events.length ? events.map((ev:any, idx:number)=> (
              <div key={idx} style={{ padding: '6px 0', borderBottom: idx < events.length-1 ? '1px dashed #f1f5f9' : 'none' }}>
                <div style={{ fontWeight: 600 }}>{ev.type}</div>
                <div style={{ color: '#666', fontSize: 12 }}>{ev.created_at ? new Date(ev.created_at).toLocaleString() : '—'} · {ev.matter_id || '—'}</div>
                <div style={{ color: '#475569', fontSize: 13 }}>{JSON.stringify(ev.payload).slice(0,120)}</div>
              </div>
            )) : <div style={{ color: '#666' }}>No runtime events yet.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

type Matter = {
  id: string
  matter_id: string
  title: string
  description: string
  status: string
  created_at?: string
  updated_at?: string
  matter_type?: string
  assignee?: string
}

type TimelineEntry = {
  id: string
  timeline_id: string
  matter_id: string
  event_type: string
  event_time: string
  description: string
  source: string
  created_at?: string
  updated_at?: string
}

export default function MatterDetail() {
  const params = useParams() as { matter_id: string }
  const [matter, setMatter] = useState<Matter | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        const q = new URLSearchParams(window.location.search).get('tab')
        if (q) return q
      }
    } catch (e) {}
    return 'overview'
  })

  async function fetchMatter() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`http://localhost:4000/matters/${params.matter_id}`)
      if (res.ok) {
        setMatter(await res.json())
        return
      }
      if (res.status === 404) {
        setError('Matter not found or backend unavailable')
      } else {
        setError('Matter not found or backend unavailable')
        console.error('fetchMatter status', res.status)
      }
    } catch (e) {
      console.error(e)
      setError('Matter not found or backend unavailable')
    } finally {
      setLoading(false)
    }
  }

  function TasksSection({ matterId }: { matterId: string }) {
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const taskIdRef = useRef<HTMLInputElement | null>(null)
    const titleRef = useRef<HTMLInputElement | null>(null)
    const descriptionRef = useRef<HTMLTextAreaElement | null>(null)
    const statusRef = useRef<HTMLInputElement | null>(null)
    const priorityRef = useRef<HTMLInputElement | null>(null)
    const dueRef = useRef<HTMLInputElement | null>(null)
    const assignedRef = useRef<HTMLInputElement | null>(null)
    const sourceRef = useRef<HTMLInputElement | null>(null)

    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`http://localhost:4000/matters/${matterId}/tasks`)
        if (res.ok) setItems(await res.json())
      } catch (e) { console.error(e) }
      setLoading(false)
    }

    useEffect(() => { load() }, [matterId])

    async function submit(e: React.FormEvent) {
      e.preventDefault()
      const payload = {
        task_id: taskIdRef.current?.value || '',
        title: titleRef.current?.value || '',
        description: descriptionRef.current?.value || '',
        status: statusRef.current?.value || '',
        priority: priorityRef.current?.value || '',
        due_date: dueRef.current?.value || null,
        assigned_to: assignedRef.current?.value || '',
        source: sourceRef.current?.value || ''
      }

      if (!payload.task_id || !payload.title) { alert('task_id and title required'); return }

      try {
        const res = await fetch(`http://localhost:4000/matters/${matterId}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (res.status === 201) {
          if (taskIdRef.current) taskIdRef.current.value = ''
          if (titleRef.current) titleRef.current.value = ''
          if (descriptionRef.current) descriptionRef.current.value = ''
          if (statusRef.current) statusRef.current.value = ''
          if (priorityRef.current) priorityRef.current.value = ''
          if (dueRef.current) dueRef.current.value = ''
          if (assignedRef.current) assignedRef.current.value = ''
          if (sourceRef.current) sourceRef.current.value = ''
          await load()
        } else { const t = await res.text().catch(()=>''); console.error('create failed', res.status, t); alert('Create failed') }
      } catch (err) { console.error(err); alert('Create failed') }
    }

    async function handlePatch(task_id: string, patch: Record<string, any>) {
      try {
        const res = await fetch(`http://localhost:4000/matters/${matterId}/tasks/${task_id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
        if (res.status === 200) await load()
        else { const t = await res.text().catch(()=>''); console.error('patch failed', res.status, t); alert('Update failed') }
      } catch (err) { console.error(err); alert('Update failed') }
    }

    async function handleDelete(task_id: string) {
      if (!confirm(`Delete task ${task_id}?`)) return
      try {
        const res = await fetch(`http://localhost:4000/matters/${matterId}/tasks/${task_id}`, { method: 'DELETE' })
        if (res.status === 204) await load()
        else { alert('Delete failed') }
      } catch (err) { console.error(err); alert('Delete failed') }
    }

    return (
      <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: '#fff' }}>
        <h3>Tasks</h3>

        <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#fafafa' }}>
          <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input placeholder="task_id" ref={taskIdRef} required />
            <input placeholder="title" ref={titleRef} required />
            <input placeholder="status" ref={statusRef} />
            <input placeholder="priority" ref={priorityRef} />
            <input placeholder="due_at (ISO)" ref={dueRef} />
            <input placeholder="assigned_to" ref={assignedRef} />
            <input placeholder="source" ref={sourceRef} />
            <textarea placeholder="description" ref={descriptionRef} style={{ gridColumn: '1 / -1' }} />
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit">Create Task</button>
              <button type="button" onClick={load} style={{ marginLeft: 8 }}>Refresh</button>
            </div>
          </form>
        </div>

        <div>
          {loading ? <div>Loading...</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Task ID</th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Title</th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Description</th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Status</th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Priority</th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Due At</th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Assigned To</th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Source</th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Created At</th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.task_id}>
                    <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.task_id}</td>
                    <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.title}</td>
                    <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.description}</td>
                    <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.status}</td>
                    <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.priority}</td>
                    <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.due_date ? new Date(it.due_date).toISOString() : ''}</td>
                    <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.assigned_to ?? it.assigned_to}</td>
                    <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.source}</td>
                    <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.created_at ? new Date(it.created_at).toISOString() : ''}</td>
                    <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>
                      {it.status !== 'completed' ? <button onClick={() => handlePatch(it.task_id, { status: 'completed' })}>Mark Completed</button> : <button onClick={() => handlePatch(it.task_id, { status: 'open' })}>Mark Active</button>}
                      <button onClick={() => handleDelete(it.task_id)} style={{ marginLeft: 8 }}>Delete</button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: 12 }}>No tasks</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  useEffect(() => { fetchMatter() }, [params.matter_id])

  if (loading) return <main style={{ padding: 24 }}><div>Loading...</div></main>
  if (error) return (
    <main style={{ padding: 24 }}>
      <div style={{ padding: 24, borderRadius: 8, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <h2>Matter not found or backend unavailable</h2>
        <p style={{ color: '#666' }}>{error}</p>
        <div style={{ marginTop: 12 }}>
          <a href="/matters"><button style={{ padding: '8px 12px', borderRadius: 8, background: '#0366d6', color: '#fff', border: 'none' }}>Back to Matters</button></a>
        </div>
      </div>
    </main>
  )
  if (!matter) return null

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'ai_summary', label: 'AI Summary' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'materials', label: 'Materials' },
    { id: 'research', label: 'Research' },
    { id: 'documents', label: 'Documents' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'ai_assistant', label: 'AI Assistant' },
  ]

  return (
    <main style={{ padding: 24 }}>
      <RuntimeSummaryPanel matterId={matter.matter_id} />
      <MatterIntakeCard matterId={matter.matter_id} />
      <div style={{ display: 'flex', gap: 24 }}>
        <aside style={{ width: 260, minHeight: '70vh' }}>
          <div style={{ position: 'sticky', top: 24 }}>
            <div style={{ padding: 16, borderRadius: 12, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>{matter.title}</h2>
              <div style={{ marginTop: 8, color: '#666' }}>{matter.matter_id}</div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ padding: '6px 8px', background: '#f0f7ff', borderRadius: 8, fontSize: 12 }}>{matter.status}</div>
                <div style={{ padding: '6px 8px', background: '#f7fff7', borderRadius: 8, fontSize: 12 }}>{matter.matter_type}</div>
              </div>
            </div>

            <nav style={{ marginTop: 16 }}>
              {sections.map(s => (
                <div key={s.id} style={{ marginBottom: 8 }}>
                  <button onClick={() => setActive(s.id)} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: 'none', background: active === s.id ? '#0366d6' : '#f6f7fb', color: active === s.id ? '#fff' : '#0b1226', cursor: 'pointer' }}>{s.label}</button>
                </div>
              ))}
            </nav>

            <div style={{ marginTop: 20, padding: 12, borderRadius: 8, background: '#fff8f0', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#666' }}>Quick Actions</div>
              <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                <button style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: '#0366d6', color: '#fff' }}>New Document</button>
                <button style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #eee', background: '#fff' }}>Assign Task</button>
              </div>
            </div>
          </div>
        </aside>

        <section style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ padding: 20, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h1 style={{ margin: 0 }}>{matter.title}</h1>
                    <div style={{ color: '#666', marginTop: 6 }}>{matter.matter_id} · {matter.status} · {matter.matter_type}</div>
                  </div>
                  <div style={{ textAlign: 'right', color: '#666' }}>
                    <div>Created: {matter.created_at}</div>
                    <div>Updated: {matter.updated_at}</div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <p style={{ margin: 0 }}>{matter.description || 'No description'}</p>
                </div>
              </div>

              {active === 'overview' && (
                <div style={{ marginTop: 16 }}>
                  {/* Matter Header */}
                  <div style={{ padding: 20, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 16 }} id="matter-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <h1 style={{ margin: 0 }}>{matter.title}</h1>
                        <div style={{ color: '#666', marginTop: 6 }}>{matter.matter_id} · {matter.matter_type} · {matter.status}</div>
                        <div style={{ marginTop: 8, color: '#444' }}>负责律师: {matter.assignee ?? '—'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div>Created: {matter.created_at}</div>
                        <div>Updated: {matter.updated_at}</div>
                        <div style={{ marginTop: 8, padding: '6px 10px', display: 'inline-block', borderRadius: 999, background: '#eef2ff', color: '#1e3a8a', fontWeight: 600 }}>AI Health: {/* placeholder, RuntimeSummaryPanel also shows health */}—</div>
                      </div>
                    </div>
                  </div>

                  {/* AI Today */}
                  <div style={{ marginBottom: 16, display: 'flex', gap: 16 }} id="ai-today">
                    <div style={{ flex: 1, padding: 16, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                      <h3 style={{ marginTop: 0 }}>AI Today</h3>
                      <ul style={{ margin: 0, paddingLeft: 16, color: '#333' }}>
                        <li>下一步: —</li>
                        <li>风险: —</li>
                        <li>待确认事项: —</li>
                        <li>Pending Proposals: <span id="ai-today-pending">—</span></li>
                      </ul>
                    </div>
                    <div style={{ width: 320, padding: 16, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                      <h4 style={{ marginTop: 0 }}>Runtime Summary</h4>
                      <div id="ai-today-runtime-summary">(See Runtime Summary Panel)</div>
                    </div>
                  </div>

                  {/* Matter Intake / Materials Import (small) */}
                  <div style={{ marginBottom: 16 }} id="matter-intake-section">
                    <div style={{ padding: 12, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                      <h4 style={{ marginTop: 0 }}>Matter Intake</h4>
                      <div style={{ color: '#666', marginBottom: 8 }}>Quick import: upload recordings, images, PDFs or chat exports to start intake.</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input id="intake-file-input" type="file" />
                        <button onClick={async () => {
                          const el = document.getElementById('intake-file-input') as HTMLInputElement | null
                          const f = el?.files?.[0]
                          if (!f) { alert('Select a file first'); return }
                          try {
                            const fd = new FormData()
                            fd.append('file', f)
                            fd.append('title', f.name)
                            fd.append('source', 'intake-ui')
                            const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
                            const matRes = await fetch(`${API}/matters/${matter.matter_id}/materials`, { method: 'POST', body: fd })
                            if (matRes.status === 201 || matRes.ok) {
                              // create a timeline entry to indicate import
                              await fetch(`${API}/matters/${matter.matter_id}/timeline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeline_id: 'tl-' + Date.now(), event_type: 'material_imported', event_time: new Date().toISOString(), description: `Imported ${f.name} via Intake`, source: 'intake-ui' }) })
                              // refresh workspace
                              window.location.reload()
                            } else {
                              const t = await matRes.text().catch(()=>'')
                              alert('Import failed: ' + matRes.status + ' ' + t)
                            }
                          } catch (err) { console.error(err); alert('Import failed') }
                        }}>Import</button>
                      </div>
                    </div>
                  </div>

                  {/* Main Workspace: Left / Right */}
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ flex: '0 0 65%', minWidth: 0 }}>
                      <div style={{ padding: 12, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 12 }} id="workspace-timeline">
                        <h3 style={{ marginTop: 0 }}>Timeline</h3>
                        <ReadOnlyTimeline matterId={matter.matter_id} />
                      </div>

                      <div style={{ padding: 12, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 12 }} id="workspace-tasks">
                        <h3 style={{ marginTop: 0 }}>Tasks</h3>
                        <ReadOnlyTasks matterId={matter.matter_id} />
                      </div>

                      <div style={{ padding: 12, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 12 }} id="workspace-documents">
                        <h3 style={{ marginTop: 0 }}>Documents</h3>
                        <ReadOnlyDocuments matterId={matter.matter_id} />
                      </div>

                      <div style={{ padding: 12, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }} id="workspace-evidence">
                        <h3 style={{ marginTop: 0 }}>Evidence</h3>
                        <ReadOnlyEvidence matterId={matter.matter_id} />
                      </div>
                    </div>

                    <div style={{ flex: '0 0 35%', minWidth: 0 }}>
                      <div style={{ padding: 12, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 12 }} id="workspace-client">
                        <h4 style={{ marginTop: 0 }}>Client</h4>
                        <ReadOnlyClient matterId={matter.matter_id} />
                      </div>

                      <div style={{ padding: 12, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 12 }} id="workspace-materials">
                        <h4 style={{ marginTop: 0 }}>Materials</h4>
                        <ReadOnlyMaterials matterId={matter.matter_id} />
                      </div>

                      <div style={{ padding: 12, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 12 }} id="workspace-info">
                        <h4 style={{ marginTop: 0 }}>Matter Info</h4>
                        <div>Title: {matter.title}</div>
                        <div>ID: {matter.matter_id}</div>
                        <div>Status: {matter.status}</div>
                      </div>

                      <div style={{ padding: 12, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }} id="workspace-recent-events">
                        <h4 style={{ marginTop: 0 }}>Recent Events</h4>
                        <ReadOnlyRecentEvents matterId={matter.matter_id} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {active === 'ai_summary' && (
                <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: '#fff' }}>
                  <h3>AI Summary</h3>
                  <div style={{ color: '#666' }}>AI summary (mock)</div>
                </div>
              )}

              {active === 'timeline' && (
                <div style={{ marginTop: 16 }}>
                  <TimelineSection matterId={matter.matter_id} />
                </div>
              )}

              {active === 'evidence' && (
                <EvidenceSection matterId={matter.matter_id} />
              )}

              {active === 'materials' && (
                <MaterialsSection matterId={matter.matter_id} />
              )}

              {active === 'documents' && (
                <DocumentsSection matterId={matter.matter_id} />
              )}

              {active === 'research' && (
                <ResearchSection matterId={matter.matter_id} />
              )}

              {active === 'tasks' && (
                <TasksSection matterId={matter.matter_id} />
              )}
            </div>

            <div style={{ width: 360 }}>
              {active === 'ai_assistant' ? (
                <ConversationShell matterId={matter.matter_id} />
              ) : (
                <div style={{ padding: 12, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontWeight: 600 }}>AI Assistant</div>
                  <div style={{ color: '#666', marginTop: 8 }}>Quick assistant panel. Switch to 'AI Assistant' for chat view.</div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function MatterIntakeCard({ matterId }: { matterId: string }) {
  // Minimal component placeholder to satisfy JSX usage.
  // The detailed intake UI exists inline in the Overview section.
  return null
}

function ConversationShell({ matterId }: { matterId: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <InnerConversationShell matterId={matterId} />
      </div>
      <div style={{ width: 420 }}>
        <ActionProposalsSection matterId={matterId} />
      </div>
    </div>
  )
}

function InnerConversationShell({ matterId }: { matterId: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:4000/matters/${matterId}/conversation`)
      if (res.ok) setMessages(await res.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [matterId])

  async function send() {
    const text = inputRef.current?.value || ''
    if (!text) return
    const mid = `ui-conv-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
    try {
      await fetch(`http://localhost:4000/matters/${matterId}/conversation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message_id: mid, role: 'user', content: text }) })
      const aid = `ui-conv-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
      const assistantContent = 'This is AI Assistant Shell.\n\nLLM will be connected in M5.'
      await fetch(`http://localhost:4000/matters/${matterId}/conversation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message_id: aid, role: 'assistant', content: assistantContent }) })
      if (inputRef.current) inputRef.current.value = ''
      await load()
    } catch (err) { console.error(err); alert('Send failed') }
  }

  return (
    <div style={{ padding: 12, borderRadius: 12, background: '#fff', height: '60vh', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
      <div style={{ fontWeight: 600 }}>AI Lawyer Assistant</div>
      <div style={{ marginTop: 8, color: '#666' }}>当前 Matter：{matterId}</div>

      <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#f7f7f9', color: '#222' }}>
        <div><strong>Assistant</strong></div>
        <div style={{ marginTop: 8 }}>你好，</div>
        <div>我是 LawDesk AI Assistant。</div>
        <div style={{ marginTop: 8 }}>我已经连接当前 Matter。</div>
        <div style={{ marginTop: 8 }}>目前支持：</div>
        <ul>
          <li>总结材料</li>
          <li>分析证据</li>
          <li>法律检索</li>
          <li>起草文书</li>
          <li>下一步建议</li>
        </ul>
      </div>

      <div style={{ marginTop: 12, flex: 1, overflow: 'auto', padding: 8, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
        <h4>聊天记录</h4>
        {loading ? <div>Loading...</div> : messages.map(m => (
          <div key={m.ai_record_id} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#666' }}>{m.model === 'user' ? 'User' : (m.model === 'assistant' ? 'Assistant' : 'System')}</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{m.prompt_uri}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <input placeholder="Type a message" ref={inputRef} style={{ flex: 1, padding: '8px 10px', borderRadius: 8 }} />
        <button onClick={send}>Send</button>
      </div>
    </div>
  )
}

function ActionProposalsSection({ matterId }: { matterId: string }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:4000/matters/${matterId}/action-proposals`)
      if (res.ok) setItems(await res.json())
      else setItems([])
    } catch (e) { console.error(e); setItems([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [matterId])

  async function generate() {
    if (!confirm('Generate AI proposals?')) return
    setGenerating(true)
    try {
      const res = await fetch(`http://localhost:4000/matters/${matterId}/action-proposals`, { method: 'POST' })
      if (!res.ok) { const t = await res.text().catch(()=>''); console.error('generate failed', res.status, t); alert('Generate failed') }
      await load()
    } catch (e) { console.error(e); alert('Generate failed') }
    setGenerating(false)
  }

  async function patchStatus(proposal_id: string, status: string) {
    try {
      const res = await fetch(`http://localhost:4000/matters/${matterId}/action-proposals/${proposal_id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      if (!res.ok) { const t = await res.text().catch(()=>''); console.error('patch failed', res.status, t); alert('Update failed') }
      await load()
    } catch (e) { console.error(e); alert('Update failed') }
  }

  return (
    <div style={{ padding: 12, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', maxHeight: '70vh', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600 }}>Action Proposals</div>
        <div>
          <button onClick={generate} disabled={generating} style={{ padding: '6px 8px', borderRadius: 8 }}>{generating ? 'Generating...' : 'Generate AI Proposals'}</button>
          <button onClick={load} style={{ marginLeft: 8, padding: '6px 8px', borderRadius: 8 }}>Refresh</button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {loading ? <div>Loading...</div> : (
          items.length === 0 ? <div style={{ color: '#666' }}>No proposals</div> : items.map(it => (
            <div key={it.proposal_id} style={{ padding: 10, borderRadius: 8, border: '1px solid #f0f0f0', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{it.title || it.action}</div>
              <div style={{ marginTop: 6, color: '#333' }}>{it.reason}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>Action: {it.action}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>Status: {it.status}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>Created: {it.created_at ? new Date(it.created_at).toISOString() : ''}</div>
              {it.status === 'pending' && (
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => { if (confirm('Approve this proposal?')) patchStatus(it.proposal_id, 'approved') }}>Approve</button>
                  <button onClick={() => { if (confirm('Reject this proposal?')) patchStatus(it.proposal_id, 'rejected') }} style={{ marginLeft: 8 }}>Reject</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function TimelineSection({ matterId }: { matterId: string }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(false)
  const timelineIdRef = useRef<HTMLInputElement | null>(null)
  const eventTypeRef = useRef<HTMLInputElement | null>(null)
  const eventTimeRef = useRef<HTMLInputElement | null>(null)
  const sourceRef = useRef<HTMLInputElement | null>(null)
  const materialIdRef = useRef<HTMLInputElement | null>(null)
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:4000/matters/${matterId}/timeline`)
      if (res.ok) setEntries(await res.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [matterId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      timeline_id: timelineIdRef.current?.value || '',
      event_type: eventTypeRef.current?.value || '',
      event_time: eventTimeRef.current?.value || '',
      description: descriptionRef.current?.value || '',
      source: sourceRef.current?.value || '',
    }

    if (!payload.timeline_id || !payload.event_type || !payload.event_time) {
      console.error('validation failed', payload)
      return
    }

    try {
      console.log('timeline create payload', payload)
      const res = await fetch(`http://localhost:4000/matters/${matterId}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      let bodyText: string | object = ''
      try { bodyText = await res.clone().json() } catch { bodyText = await res.clone().text() }
      console.log('timeline create response', res.status, bodyText)

      if (res.status === 201) {
        // clear inputs
        if (timelineIdRef.current) timelineIdRef.current.value = ''
        if (eventTypeRef.current) eventTypeRef.current.value = ''
        if (eventTimeRef.current) eventTimeRef.current.value = ''
        if (sourceRef.current) sourceRef.current.value = ''
        if (descriptionRef.current) descriptionRef.current.value = ''
        await load()
      } else {
        console.error('create failed', res.status, bodyText)
      }
    } catch (err) { console.error(err) }
  }

  return (
    <div>
      <h2>Timeline</h2>
      <div style={{ marginBottom: 12 }}>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input placeholder="timeline_id" ref={timelineIdRef} required />
          <input placeholder="event_type" ref={eventTypeRef} required />
          <input placeholder="event_time (ISO)" ref={eventTimeRef} required />
          <input placeholder="source" ref={sourceRef} />
          <textarea placeholder="description" ref={descriptionRef} style={{ gridColumn: '1 / -1' }} />
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit">Create</button>
            <button type="button" onClick={load} style={{ marginLeft: 8 }}>Refresh</button>
          </div>
        </form>
      </div>

      <div>
        {loading ? <div>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Event Type</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Event Time</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Description</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(en => (
                <tr key={en.timeline_id}>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{en.event_type}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{new Date(en.event_time).toISOString()}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{en.description}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{en.source}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 12 }}>No timeline entries</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function EvidenceSection({ matterId }: { matterId: string }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const evidenceIdRef = useRef<HTMLInputElement | null>(null)
  const evidenceTypeRef = useRef<HTMLInputElement | null>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)
  const sourceRef = useRef<HTMLInputElement | null>(null)
  const materialIdRef = useRef<HTMLInputElement | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:4000/matters/${matterId}/evidence`)
      if (res.ok) setItems(await res.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [matterId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      evidence_id: evidenceIdRef.current?.value || '',
      evidence_type: evidenceTypeRef.current?.value || '',
      title: titleRef.current?.value || '',
      description: descriptionRef.current?.value || '',
      source: sourceRef.current?.value || '',
      material_id: materialIdRef.current?.value || ''
    }

    if (!payload.evidence_id || !payload.title || !payload.material_id) {
      // client-side validation: material_id is required and must be provided by the user
      console.error('validation failed: evidence_id, title and material_id are required', payload)
      alert('Please provide a valid existing material_id. Evidence requires an existing material_id. Material management will be implemented later.')
      return
    }

    try {
      console.log('evidence create payload', payload)
      const res = await fetch(`http://localhost:4000/matters/${matterId}/evidence`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      let bodyText: string | object = ''
      try { bodyText = await res.clone().json() } catch { bodyText = await res.clone().text() }
      console.log('evidence create response', res.status, bodyText)
      if (res.status === 201) {
        if (evidenceIdRef.current) evidenceIdRef.current.value = ''
        if (evidenceTypeRef.current) evidenceTypeRef.current.value = ''
        if (titleRef.current) titleRef.current.value = ''
        if (descriptionRef.current) descriptionRef.current.value = ''
        if (sourceRef.current) sourceRef.current.value = ''
        await load()
      } else {
        console.error('create failed', res.status, bodyText)
      }
    } catch (err) { console.error(err) }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <h3>Evidence</h3>
      <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#fff' }}>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input placeholder="evidence_id" ref={evidenceIdRef} required />
          <input placeholder="evidence_type" ref={evidenceTypeRef} />
          <input placeholder="title" ref={titleRef} required />
          <input placeholder="source" ref={sourceRef} />
          <input placeholder="material_id (existing)" ref={materialIdRef} />
          <div style={{ gridColumn: '1 / -1', color: '#666', fontSize: 12, marginTop: 4 }}>Evidence currently requires an existing material_id. Material management will be implemented in a later milestone.</div>
          <textarea placeholder="description" ref={descriptionRef} style={{ gridColumn: '1 / -1' }} />
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit">Create</button>
            <button type="button" onClick={load} style={{ marginLeft: 8 }}>Refresh</button>
          </div>
        </form>
      </div>

      <div>
        {loading ? <div>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Evidence ID</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Type</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Title</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Description</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Source</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.evidence_id}>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.evidence_id}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.evidence_type}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.title}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.description}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.source}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{new Date(it.created_at).toISOString()}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 12 }}>No evidence records</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* Read-only variants used by the Workspace view */
function ReadOnlyTimeline({ matterId }: { matterId: string }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  useEffect(() => { (async ()=>{
    try { const res = await fetch(`http://localhost:4000/matters/${matterId}/timeline`); if (res.ok) setEntries(await res.json()) } catch(e) { console.error(e) }
  })() }, [matterId])
  return (
    <div>
      {entries.length === 0 ? <div style={{ color: '#666' }}>No timeline entries</div> : (
        <ul style={{ margin: 0, paddingLeft: 16 }}>{entries.map(en => (<li key={en.timeline_id}>{en.event_time} · {en.event_type} · {en.description}</li>))}</ul>
      )}
    </div>
  )
}

function ReadOnlyTasks({ matterId }: { matterId: string }) {
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { (async ()=>{ try { const res = await fetch(`http://localhost:4000/matters/${matterId}/tasks`); if (res.ok) setItems(await res.json()) } catch(e){console.error(e)} })() }, [matterId])
  return (
    <div>
      {items.length === 0 ? <div style={{ color: '#666' }}>No tasks</div> : (
        <ul style={{ margin: 0, paddingLeft: 16 }}>{items.map(it => (<li key={it.task_id}>{it.title} · {it.status}</li>))}</ul>
      )}
    </div>
  )
}

function ReadOnlyDocuments({ matterId }: { matterId: string }) {
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { (async ()=>{ try { const res = await fetch(`http://localhost:4000/matters/${matterId}/documents`); if (res.ok) setItems(await res.json()) } catch(e){console.error(e)} })() }, [matterId])
  return (
    <div>
      {items.length === 0 ? <div style={{ color: '#666' }}>No documents</div> : (
        <ul style={{ margin: 0, paddingLeft: 16 }}>{items.map(it => (<li key={it.document_id}>{it.title}</li>))}</ul>
      )}
    </div>
  )
}

function ReadOnlyEvidence({ matterId }: { matterId: string }) {
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { (async ()=>{ try { const res = await fetch(`http://localhost:4000/matters/${matterId}/evidence`); if (res.ok) setItems(await res.json()) } catch(e){console.error(e)} })() }, [matterId])
  return (
    <div>
      {items.length === 0 ? <div style={{ color: '#666' }}>No evidence</div> : (
        <ul style={{ margin: 0, paddingLeft: 16 }}>{items.map(it => (<li key={it.evidence_id}>{it.title}</li>))}</ul>
      )}
    </div>
  )
}

function ReadOnlyClient({ matterId }: { matterId: string }) {
  const [data, setData] = useState<any | null>(null)
  useEffect(() => { (async ()=>{ try { const res = await fetch(`http://localhost:4000/matters/${matterId}/client`); if (res.ok) setData(await res.json()) } catch(e){console.error(e)} })() }, [matterId])
  return (
    <div>
      {!data ? <div style={{ color: '#666' }}>No client</div> : (
        <div>{data.name} · {data.contact}</div>
      )}
    </div>
  )
}

function ReadOnlyMaterials({ matterId }: { matterId: string }) {
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { (async ()=>{ try { const res = await fetch(`http://localhost:4000/matters/${matterId}/materials`); if (res.ok) setItems(await res.json()) } catch(e){console.error(e)} })() }, [matterId])
  return (
    <div>
      {items.length === 0 ? <div style={{ color: '#666' }}>No materials</div> : (
        <ul style={{ margin: 0, paddingLeft: 16 }}>{items.map(it => (<li key={it.material_id}>{it.title}</li>))}</ul>
      )}
    </div>
  )
}

function ReadOnlyRecentEvents({ matterId }: { matterId: string }) {
  const [events, setEvents] = useState<any[]>([])
  useEffect(() => { (async ()=>{ try { const res = await fetch(`http://localhost:4000/matters/${matterId}/events`); if (res.ok) setEvents(await res.json()) } catch(e){console.error(e)} })() }, [matterId])
  return (
    <div>
      {events.length === 0 ? <div style={{ color: '#666' }}>No runtime events yet.</div> : (
        <ul style={{ margin: 0, paddingLeft: 16 }}>{events.slice(-5).reverse().map((ev:any, i:number)=>(<li key={i}>{ev.type} · {ev.created_at}</li>))}</ul>
      )}
    </div>
  )
}

function MaterialsSection({ matterId }: { matterId: string }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const materialIdRef = useRef<HTMLInputElement | null>(null)
  const materialTypeRef = useRef<HTMLInputElement | null>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)
  const sourceRef = useRef<HTMLInputElement | null>(null)
  const storageRef = useRef<HTMLInputElement | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:4000/matters/${matterId}/materials`)
      if (res.ok) setItems(await res.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [matterId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      material_id: materialIdRef.current?.value || '',
      material_type: materialTypeRef.current?.value || '',
      title: titleRef.current?.value || '',
      description: descriptionRef.current?.value || '',
      source: sourceRef.current?.value || '',
      storage_uri: storageRef.current?.value || ''
    }

    if (!payload.material_id || !payload.title) {
      console.error('validation failed', payload)
      alert('material_id and title are required')
      return
    }

    try {
      console.log('material create payload', payload)
      const res = await fetch(`http://localhost:4000/matters/${matterId}/materials`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      let bodyText: string | object = ''
      try { bodyText = await res.clone().json() } catch { bodyText = await res.clone().text() }
      console.log('material create response', res.status, bodyText)
      if (res.status === 201) {
        if (materialIdRef.current) materialIdRef.current.value = ''
        if (materialTypeRef.current) materialTypeRef.current.value = ''
        if (titleRef.current) titleRef.current.value = ''
        if (descriptionRef.current) descriptionRef.current.value = ''
        if (sourceRef.current) sourceRef.current.value = ''
        if (storageRef.current) storageRef.current.value = ''
        await load()
      } else {
        console.error('create failed', res.status, bodyText)
        alert('Create failed: ' + (res.status || 'unknown'))
      }
    } catch (err) { console.error(err); alert('Create failed') }
  }

  async function handleDelete(material_id: string) {
    if (!confirm(`Delete material ${material_id}?`)) return
    try {
      const res = await fetch(`http://localhost:4000/matters/${matterId}/materials/${material_id}`, { method: 'DELETE' })
      if (res.status === 204) await load()
      else {
        let body = ''
        try { body = await res.clone().text() } catch {}
        console.error('delete failed', res.status, body)
        alert('Delete failed')
      }
    } catch (err) { console.error(err); alert('Delete failed') }
  }

  return (
    <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: '#fff' }}>
      <h3>Materials</h3>

      <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#fafafa' }}>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input placeholder="material_id" ref={materialIdRef} required />
          <input placeholder="material_type" ref={materialTypeRef} />
          <input placeholder="title" ref={titleRef} required />
          <input placeholder="source" ref={sourceRef} />
          <input placeholder="storage_uri" ref={storageRef} />
          <textarea placeholder="description" ref={descriptionRef} style={{ gridColumn: '1 / -1' }} />
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit">Create Material</button>
            <button type="button" onClick={load} style={{ marginLeft: 8 }}>Refresh</button>
          </div>
        </form>
      </div>

      <div>
        {loading ? <div>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Material ID</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Type</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Title</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Description</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Source</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Storage</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Created At</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.material_id}>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.material_id}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.material_type}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.title}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.description}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.source}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.storage_uri}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.created_at ? new Date(it.created_at).toISOString() : ''}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>
                    <button onClick={() => handleDelete(it.material_id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 12 }}>No materials</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function ResearchSection({ matterId }: { matterId: string }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const researchIdRef = useRef<HTMLInputElement | null>(null)
  const researchTypeRef = useRef<HTMLInputElement | null>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)
  const queryRef = useRef<HTMLInputElement | null>(null)
  const summaryRef = useRef<HTMLTextAreaElement | null>(null)
  const sourceRef = useRef<HTMLInputElement | null>(null)
  const resultUrlRef = useRef<HTMLInputElement | null>(null)
  const statusRef = useRef<HTMLInputElement | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:4000/matters/${matterId}/research`)
      if (res.ok) setItems(await res.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [matterId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      research_id: researchIdRef.current?.value || '',
      research_type: researchTypeRef.current?.value || '',
      title: titleRef.current?.value || '',
      query: queryRef.current?.value || '',
      summary: summaryRef.current?.value || '',
      source: sourceRef.current?.value || '',
      result_url: resultUrlRef.current?.value || '',
      status: statusRef.current?.value || ''
    }

    if (!payload.research_id || !payload.title) {
      alert('research_id and title are required')
      return
    }

    try {
      const res = await fetch(`http://localhost:4000/matters/${matterId}/research`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.status === 201) {
        if (researchIdRef.current) researchIdRef.current.value = ''
        if (researchTypeRef.current) researchTypeRef.current.value = ''
        if (titleRef.current) titleRef.current.value = ''
        if (queryRef.current) queryRef.current.value = ''
        if (summaryRef.current) summaryRef.current.value = ''
        if (sourceRef.current) sourceRef.current.value = ''
        if (resultUrlRef.current) resultUrlRef.current.value = ''
        if (statusRef.current) statusRef.current.value = ''
        await load()
      } else {
        const text = await res.text().catch(()=>'')
        console.error('create failed', res.status, text)
        alert('Create failed')
      }
    } catch (err) { console.error(err); alert('Create failed') }
  }

  async function handleDelete(research_id: string) {
    if (!confirm(`Delete research ${research_id}?`)) return
    try {
      const res = await fetch(`http://localhost:4000/matters/${matterId}/research/${research_id}`, { method: 'DELETE' })
      if (res.status === 204) await load()
      else { alert('Delete failed') }
    } catch (err) { console.error(err); alert('Delete failed') }
  }

  return (
    <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: '#fff' }}>
      <h3>Research</h3>

      <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#fafafa' }}>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input placeholder="research_id" ref={researchIdRef} required />
          <input placeholder="research_type" ref={researchTypeRef} />
          <input placeholder="title" ref={titleRef} required />
          <input placeholder="query" ref={queryRef} />
          <input placeholder="source" ref={sourceRef} />
          <input placeholder="result_url" ref={resultUrlRef} />
          <input placeholder="status" ref={statusRef} />
          <textarea placeholder="summary" ref={summaryRef} style={{ gridColumn: '1 / -1' }} />
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit">Create Research</button>
            <button type="button" onClick={load} style={{ marginLeft: 8 }}>Refresh</button>
          </div>
        </form>
      </div>

      <div>
        {loading ? <div>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Research ID</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Type</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Title</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Query</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Summary</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Source</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Result URL</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Created At</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.knowledge_id}>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.knowledge_id}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.category}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.title}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.payload?.query ?? ''}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.version}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.source}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.content_uri}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.created_at ? new Date(it.created_at).toISOString() : ''}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>
                    <button onClick={() => handleDelete(it.knowledge_id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 12 }}>No research records</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function DocumentsSection({ matterId }: { matterId: string }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const documentIdRef = useRef<HTMLInputElement | null>(null)
  const documentTypeRef = useRef<HTMLInputElement | null>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)
  const contentRef = useRef<HTMLTextAreaElement | null>(null)
  const statusRef = useRef<HTMLInputElement | null>(null)
  const sourceRef = useRef<HTMLInputElement | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:4000/matters/${matterId}/documents`)
      if (res.ok) setItems(await res.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [matterId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      document_id: documentIdRef.current?.value || '',
      document_type: documentTypeRef.current?.value || '',
      title: titleRef.current?.value || '',
      content_uri: contentRef.current?.value || '',
      status: statusRef.current?.value || '',
      source: sourceRef.current?.value || ''
    }

    if (!payload.document_id || !payload.title) {
      alert('document_id and title are required')
      return
    }

    try {
      const res = await fetch(`http://localhost:4000/matters/${matterId}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.status === 201) {
        if (documentIdRef.current) documentIdRef.current.value = ''
        if (documentTypeRef.current) documentTypeRef.current.value = ''
        if (titleRef.current) titleRef.current.value = ''
        if (contentRef.current) contentRef.current.value = ''
        if (statusRef.current) statusRef.current.value = ''
        if (sourceRef.current) sourceRef.current.value = ''
        await load()
      } else {
        const txt = await res.text().catch(()=>'')
        console.error('create failed', res.status, txt)
        alert('Create failed')
      }
    } catch (err) { console.error(err); alert('Create failed') }
  }

  async function handleDelete(document_id: string) {
    if (!confirm(`Delete document ${document_id}?`)) return
    try {
      const res = await fetch(`http://localhost:4000/matters/${matterId}/documents/${document_id}`, { method: 'DELETE' })
      if (res.status === 204) await load()
      else { alert('Delete failed') }
    } catch (err) { console.error(err); alert('Delete failed') }
  }

  return (
    <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: '#fff' }}>
      <h3>Documents</h3>

      <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#fafafa' }}>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input placeholder="document_id" ref={documentIdRef} required />
          <input placeholder="document_type" ref={documentTypeRef} />
          <input placeholder="title" ref={titleRef} required />
          <input placeholder="status" ref={statusRef} />
          <input placeholder="source" ref={sourceRef} />
          <textarea placeholder="content" ref={contentRef} style={{ gridColumn: '1 / -1' }} />
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit">Create Document</button>
            <button type="button" onClick={load} style={{ marginLeft: 8 }}>Refresh</button>
          </div>
        </form>
      </div>

      <div>
        {loading ? <div>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Document ID</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Type</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Title</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Content</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Source</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Status</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Created At</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.document_id}>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.document_id}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.document_type}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.title}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.content_uri}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.source}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.status}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>{it.created_at ? new Date(it.created_at).toISOString() : ''}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}>
                    <button onClick={() => handleDelete(it.document_id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 12 }}>No documents</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
