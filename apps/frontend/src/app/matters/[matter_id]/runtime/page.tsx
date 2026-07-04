import React from 'react'

type Props = { params: { matter_id: string } }

async function fetchEvents(apiBase: string, matterId: string) {
  try {
    const res = await fetch(`${apiBase}/matters/${matterId}/events`)
    if (!res.ok) return { error: `HTTP ${res.status}` }
    return await res.json()
  } catch (e: any) {
    return { error: e?.message || String(e) }
  }
}

function payloadSummary(payload: any) {
  try {
    if (!payload) return '—'
    if (typeof payload === 'string') return payload.slice(0, 200)
    return JSON.stringify(payload).slice(0, 300)
  } catch (_e) {
    return 'payload unavailable'
  }
}

async function EventStreamRenderer({ api, id, events }: { api: string, id: string, events?: any }) {
  let resolved: any = events
  if (resolved === undefined) {
    resolved = await fetchEvents(api, id)
  }

  if (resolved?.error) {
    return <div>Error: {resolved.error}</div>
  }

  if (!Array.isArray(resolved) || resolved.length === 0) {
    return <div>No runtime events yet.</div>
  }

  return (
    <table style={{width:'100%',borderCollapse:'collapse'}} id="events-table">
      <thead>
        <tr style={{textAlign:'left', borderBottom:'1px solid #e2e8f0'}}>
          <th style={{padding:6}}>Type</th>
          <th style={{padding:6}}>Matter</th>
          <th style={{padding:6}}>Created At</th>
          <th style={{padding:6}}>Payload</th>
        </tr>
      </thead>
      <tbody>
        {resolved.map((e:any, idx:number) => (
          <tr key={idx} style={{borderBottom:'1px solid #f1f5f9'}}>
            <td style={{padding:6}}>{e.type}</td>
            <td style={{padding:6}}>{e.matter_id || '—'}</td>
            <td style={{padding:6}}>{e.created_at || e.timestamp || '—'}</td>
            <td style={{padding:6}}>{payloadSummary(e.payload)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

async function fetchJson(path: string) {
  try {
    const res = await fetch(path)
    if (!res.ok) return { error: `HTTP ${res.status}` }
    return await res.json()
  } catch (e: any) {
    return { error: e?.message || String(e) }
  }
}

export default async function RuntimePage({ params }: Props) {
  const id = params.matter_id
  const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'

  const [snapshot, director, proposals, events] = await Promise.all([
    fetchJson(`${API}/matters/${id}/runtime`),
    fetchJson(`${API}/matters/${id}/director`),
    fetchJson(`${API}/matters/${id}/action-proposals`),
    fetchJson(`${API}/matters/${id}/events`),
  ])
  const container: React.CSSProperties = { padding: 20, fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto' }
  const row: React.CSSProperties = { display: 'flex', gap: 12, marginBottom: 12 }
  const card: React.CSSProperties = { flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, background: '#fff' }
  const heading: React.CSSProperties = { margin: 0, fontSize: 14, color: '#0f172a' }
  const value: React.CSSProperties = { fontSize: 18, fontWeight: 600, marginTop: 8 }

  return (
    <div style={container}>
      <h1 style={{marginBottom:6}}>Matter Runtime Dashboard</h1>
      <div style={{marginBottom:10,color:'#334155'}}>
        <div><strong>matter_id:</strong> {id}</div>
        <div><strong>title:</strong> {snapshot?.matter?.title || '—'}</div>
        <div><strong>status:</strong> {snapshot?.matter?.status || snapshot?.workflow?.current_stage || '—'}</div>
        <div><strong>generated_at:</strong> {director?.generated_at || '—'}</div>
      </div>

      <div style={row}>
        <div style={card} id="health-card">
          <h3 style={heading}>Matter Health</h3>
          <div style={value}>{snapshot?.ai?.intelligence?.health?.score ?? '—'}</div>
          <div style={{color:'#475569'}}>{snapshot?.ai?.intelligence?.health?.status || '—'}</div>
        </div>

        <div style={card} id="workflow-card">
          <h3 style={heading}>Workflow</h3>
          <div style={value}>{snapshot?.workflow?.current_stage || '—'}</div>
          <div style={{color:'#475569'}}>Completion: {snapshot?.workflow?.completion ?? '—'}</div>
          <div style={{color:'#475569'}}>Next: {snapshot?.workflow?.next_step || '—'}</div>
        </div>

        <div style={card} id="director-card">
          <h3 style={heading}>Runtime Director</h3>
          <div style={value}>{director?.decision?.type || '—'}</div>
          <div style={{color:'#475569'}}>{director?.decision?.reason || '—'}</div>
          <div style={{color:'#475569'}}>Next: {director?.decision?.recommended_next || '—'}</div>
        </div>

        <div style={card} id="pending-proposals-card">
          <h3 style={heading}>Pending Proposals</h3>
          <div style={value}>{Array.isArray(proposals) ? proposals.filter((p:any)=>p.status==='pending').length : '—'}</div>
          <div style={{color:'#475569'}}>{Array.isArray(proposals) && proposals.find((p:any)=>p.status==='pending')?.title || '—'}</div>
        </div>
      </div>

      <div style={{marginBottom:12}}>
        <h2 style={{margin:0}}>Intelligence Panel</h2>
        <div style={{border:'1px solid #e2e8f0', borderRadius:8, padding:12, marginTop:8}}>
          <div><strong>Priority:</strong> {snapshot?.ai?.intelligence?.priority?.level || '—'}</div>
          <div><strong>Reason:</strong> {snapshot?.ai?.intelligence?.priority?.reason || '—'}</div>
          <div><strong>Next Action:</strong> {snapshot?.ai?.intelligence?.next_action?.title || '—'}</div>
          <div><strong>Next Reason:</strong> {snapshot?.ai?.intelligence?.next_action?.reason || '—'}</div>
          <div><strong>Alerts:</strong> {(snapshot?.ai?.intelligence?.alerts || []).join('; ') || '—'}</div>
          <div><strong>Recommendations:</strong> {(snapshot?.ai?.intelligence?.recommendations || []).join('; ') || '—'}</div>
        </div>
      </div>

      <div style={{display:'flex', gap:12, marginBottom:12}}>
        <div style={{flex:1, border:'1px solid #e2e8f0', borderRadius:8, padding:12}}>
          <h3 style={{margin:0}}>Tasks</h3>
          <div>{snapshot?.tasks?.open ?? '—'} open</div>
        </div>
        <div style={{flex:1, border:'1px solid #e2e8f0', borderRadius:8, padding:12}}>
          <h3 style={{margin:0}}>Documents</h3>
          <div>{snapshot?.documents?.total ?? '—'}</div>
        </div>
        <div style={{flex:1, border:'1px solid #e2e8f0', borderRadius:8, padding:12}}>
          <h3 style={{margin:0}}>Research</h3>
          <div>{snapshot?.research?.total ?? '—'}</div>
        </div>
        <div style={{flex:1, border:'1px solid #e2e8f0', borderRadius:8, padding:12}}>
          <h3 style={{margin:0}}>Evidence</h3>
          <div>{snapshot?.evidence?.total ?? '—'}</div>
        </div>
        <div style={{flex:2, border:'1px solid #e2e8f0', borderRadius:8, padding:12}}>
          <h3 style={{margin:0}}>Timeline Recent</h3>
          <div>{(snapshot?.timeline || []).slice(0,5).map((t:any)=>t.title || t.type).join(' • ') || '—'}</div>
        </div>
      </div>

      <div id="event-stream" style={{marginTop:16}}>
        <h2 style={{margin:0}}>Runtime Event Stream</h2>
        <div style={{border:'1px solid #e2e8f0', borderRadius:8, padding:8, marginTop:8}}>
          <EventStreamRenderer api={API} id={id} events={Array.isArray(events) ? events : undefined} />
        </div>
      </div>

      <div>
        <h2 style={{margin:0}}>Action Proposals</h2>
        <div style={{border:'1px solid #e2e8f0', borderRadius:8, padding:8, marginTop:8}}>
          {proposals?.error ? (
            <div>Error: {proposals.error}</div>
          ) : (
            Array.isArray(proposals) && proposals.length ? (
              <table style={{width:'100%',borderCollapse:'collapse'}} id="proposals-table">
                <thead>
                  <tr style={{textAlign:'left', borderBottom:'1px solid #e2e8f0'}}>
                    <th style={{padding:6}}>Title</th>
                    <th style={{padding:6}}>Action</th>
                    <th style={{padding:6}}>Status</th>
                    <th style={{padding:6}}>Source</th>
                    <th style={{padding:6}}>Planner Provider</th>
                    <th style={{padding:6}}>Planner Model</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((p:any)=> (
                    <tr key={p.proposal_id} style={{borderBottom:'1px solid #f1f5f9'}}>
                      <td style={{padding:6}}>{p.title}</td>
                      <td style={{padding:6}}>{p.action}</td>
                      <td style={{padding:6}}>{p.status}</td>
                      <td style={{padding:6}}>{p.source}</td>
                      <td style={{padding:6}}>{p.planner_provider}</td>
                      <td style={{padding:6}}>{p.planner_model}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div>No proposals</div>
            )
          )}
        </div>
      </div>

      <div style={{marginTop:20}}>
        <details>
          <summary style={{cursor:'pointer', padding:8, fontWeight:600}}>Developer Runtime Kernel</summary>
          <div style={{padding:12, background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, marginTop:8}}>
            <pre style={{whiteSpace:'pre-wrap', wordBreak:'break-word'}}>
{JSON.stringify({
  runtime_state: snapshot?.runtime_state ?? null,
  runtime_decision: snapshot?.runtime_decision ?? null,
  runtime_plan: snapshot?.runtime_plan ?? null,
  runtime_assignments: snapshot?.runtime_assignments ?? [],
  runtime_works: snapshot?.runtime_works ?? [],
  runtime_actions: snapshot?.runtime_actions ?? []
}, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    </div>
  )
}
