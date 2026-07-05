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
      {items.length === 0 && <div style={{ color: '#666' }}>暂无内容</div>}
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
  const [opLoading, setOpLoading] = useState<string | null>(null)

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

  // fetch runtime snapshot (used after operations)
  async function fetchRuntime() {
    try {
      const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
      const res = await fetch(`${API}/matters/${params.matter_id}/runtime`)
      if (!res.ok) return
      const rt = await res.json()
      setRuntime(rt)
    } catch (e) {
      console.error('fetchRuntime failed', e)
    }
  }

  async function callOperation(item: any, operation: 'start'|'pause'|'complete') {
    const queue_id = item?.queue_id
    if (!queue_id) return
    setOpLoading(queue_id)
    try {
      const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
      const payload = {
        operation,
        action_id: item?.action_id,
        work_id: item?.work_id ?? null,
        slot: item?.slot,
      }
      const res = await fetch(`${API}/matters/${params.matter_id}/execution/${queue_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const txt = await res.text().catch(()=>null)
        alert('操作失败: ' + (txt || res.statusText))
        return
      }
      // refresh runtime snapshot after successful op
      await fetchRuntime()
    } catch (e:any) {
      console.error('operation failed', e)
      alert('操作失败')
    } finally {
      setOpLoading(null)
    }
  }

  const mapExecutionStatusLabel = (s?: string) => {
    const v = String(s || 'PENDING').toUpperCase()
    if (v === 'PENDING') return '待开始'
    if (v === 'RUNNING') return '进行中'
    if (v === 'DONE') return '已完成'
    return s || '待开始'
  }

  const mapExecutionStatusLabelForActiveWork = (s?: string) => {
    const v = String(s || 'PENDING').toUpperCase()
    if (v === 'PENDING') return '暂不可执行'
    if (v === 'RUNNING') return '执行中'
    if (v === 'DONE') return '已完成'
    return s || '暂不可执行'
  }

  const findQueueForAction = (a: any) => {
    if (!runtime || !Array.isArray(runtime.today_queue)) return null
    return runtime.today_queue.find((q:any) => (a.action_id && q.action_id === a.action_id) || (a.work_id && q.work_id === a.work_id) ) || null
  }

  const findQueueForWork = (w: any) => {
    if (!runtime || !Array.isArray(runtime.today_queue)) return null
    return runtime.today_queue.find((q:any) => (w.work_id && q.work_id === w.work_id) || (w.action_id && q.action_id === w.action_id)) || null
  }

  if (loading) return <main style={{ padding: 24 }}><div>正在加载工作区…</div></main>
  if (error) return <main style={{ padding: 24 }}><div style={{ color: '#b91c1c' }}>错误：{error}</div></main>
  if (!data) return null

  const matter = data.matter || { matter_id: params.matter_id, title: '', status: '' }
  const recentActivity = (data as any).recent_activity ?? []
  const aiNextSteps = (data as any).ai_next_steps ?? []

  const mapDecisionCode = (code?: string) => {
    switch (String(code || '').toUpperCase()) {
      case 'COLLECT_EVIDENCE':
        return '需要先补强证据'
      case 'REVIEW_EVIDENCE':
        return '需要审查现有证据'
      case 'RESEARCH_LAW':
        return '需要补充法律检索'
      case 'REVIEW_DOCUMENT':
        return '需要审查文书草稿'
      case 'MONITOR_MATTER':
        return '当前以跟进观察为主'
      case 'NO_ACTION':
        return '暂无明确下一步'
      default:
        return String(code || '')
    }
  }

  const mapPriority = (p?: string) => {
    switch (String(p || '').toUpperCase()) {
      case 'HIGH': return '高优先级'
      case 'MEDIUM': return '中优先级'
      case 'LOW': return '低优先级'
      default: return p || '—'
    }
  }

  const mapActionToLabel = (a: any) => {
    const type = String(a?.type || (a?.payload?.target_type || '')).toLowerCase()
    if (type.includes('evidence')) return '准备证据材料'
    if (type.includes('document')) return '审查或准备法律文书'
    if (type.includes('research')) return '补充法律检索'
    if (type.includes('monitor')) return '跟进案件进展'
    return '执行任务'
  }

  const mapStatusLabel = (s: string) => String(s || '').toUpperCase() === 'READY' ? '可开始' : '暂不可执行'

  const mapWorkTypeLabel = (t?: string) => {
    switch (String(t || '')) {
      case 'EvidenceWork': return '证据工作'
      case 'DocumentWork': return '文书工作'
      case 'ResearchWork': return '检索工作'
      case 'MonitorWork': return '跟进工作'
      default: return t || ''
    }
  }

  const mapWorkTitle = (title?: string) => {
    if (!title) return ''
    const s = String(title).toLowerCase()
    if (s.includes('evidence collection')) return '证据准备'
    if (s.includes('evidence review')) return '证据审查'
    if (s.includes('legal research')) return '法律检索'
    if (s.includes('document review')) return '文书审查'
    if (s.includes('matter monitoring')) return '案件跟进'
    return title
  }

  // button styles
  const primaryBtn: React.CSSProperties = { padding: '6px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8 }
  const secondaryBtn: React.CSSProperties = { padding: '6px 10px', background: '#fff', color: '#374151', border: '1px solid #cbd5e1', borderRadius: 8 }

  return (
    <main style={{ padding: 24 }}>
      {/* Header: 案件名称 + 状态 + 收案日期(若有) */}
      <div style={{ padding: 20, borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <h1 style={{ margin: 0 }}>{matter.title || '未命名案件'}</h1>
        <div style={{ color: '#666', marginTop: 6, fontSize: 13 }}>{matter.status}</div>
        { (matter as any).received_at ? <div style={{ color: '#94a3b8', marginTop: 4, fontSize: 12 }}>收案日期：{new Date((matter as any).received_at).toLocaleDateString()}</div> : null }
      </div>

      {/* 第一部分：AI 主席（重要卡片） + Summary 卡片 */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <div style={{ padding: 16, borderRadius: 8, background: '#fff', border: '1px solid #e6edf0', minWidth: 320 }}>
          <div style={{ fontSize: 14, color: '#475569', fontWeight: 700 }}>AI 主席</div>
          <div style={{ marginTop: 8, fontWeight: 600 }}>当前阶段：{runtime?.runtime_plan?.stage || '—'}</div>
          <div style={{ marginTop: 8 }}>今天建议完成：</div>
          <ol style={{ marginTop: 6, paddingLeft: 18 }}>
            <li>上传银行流水</li>
            <li>上传微信聊天</li>
            <li>自动生成证据目录</li>
          </ol>
          <div style={{ marginTop: 8 }}>预计耗时：{runtime?.runtime_plan?.estimate || '—'}</div>
          <div style={{ marginTop: 8, color: '#2563eb', fontWeight: 600 }}>完成后：即可进入起诉准备</div>
        </div>

        <SummaryCard title="案件资料" value={data.summary.materials} />
        <SummaryCard title="正式证据" value={data.summary.evidence} />
        <SummaryCard title="案件文书" value={data.summary.documents} />
        <SummaryCard title="AI建议" value={data.summary.pending_ai_suggestions} />
      </div>

      {/* Workspace Objects 卡片，统一中文并提供查看按钮 */}
      {Array.isArray((data as any).object_navigation) && (
        <div style={{ marginTop: 20 }}>
          <h3>工作区对象</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            {(data as any).object_navigation.map((obj: any) => {
              // map common keys to Chinese labels
              const key = String(obj.key || '').toLowerCase()
              let label = obj.label || ''
              if (key.includes('material') || key.includes('materials')) label = '案件资料'
              else if (key.includes('evidence')) label = '正式证据'
              else if (key.includes('document') || key.includes('documents')) label = '案件文书'

              return (
                <div key={obj.key} style={{ padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #e6edf0', minWidth: 180 }}>
                  <div style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>{label}</div>
                  <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{obj.count}</div>
                  <div style={{ marginTop: 8 }}>
                    <a href={obj.href} style={{ textDecoration: 'none' }}>
                      <button style={{ padding: '8px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8 }}>查看 →</button>
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 第一行：今日队列 | 当前目标 */}
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <h3>今日队列</h3>
          <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
            {runtime && Array.isArray(runtime.today_queue) ? (
              (() => {
                const now = runtime.today_queue.filter((q:any) => q.slot === 'NOW')
                const today = runtime.today_queue.filter((q:any) => q.slot === 'TODAY')
                const later = runtime.today_queue.filter((q:any) => q.slot === 'LATER')
                if (runtime.today_queue.length === 0) return <div style={{ color: '#666' }}>暂无内容</div>
                return (
                  <div>
                    {now.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 700 }}>立即执行</div>
                        {now.map((q:any, idx:number) => (
                          <div key={idx} style={{ padding: '6px 0', borderBottom: idx === now.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                            <div style={{ fontWeight: 600 }}>任务名称：{mapActionToLabel(q)}</div>
                            <div style={{ color: '#666' }}>预计耗时：{q.estimate || q.estimated_time || q.duration || '—'}</div>
                            <div style={{ marginTop: 6 }}>
                              <div style={{ color: '#374151', fontSize: 13 }}>{mapExecutionStatusLabel(q.execution_status)}</div>
                              <div style={{ marginTop: 6 }}>
                                {((q.execution_status || 'PENDING').toUpperCase() === 'PENDING') && (
                                  <button onClick={() => callOperation(q, 'start')} disabled={opLoading === q.queue_id} style={primaryBtn}>开始</button>
                                )}
                                {((q.execution_status || 'PENDING').toUpperCase() === 'RUNNING') && (
                                  <>
                                    <button onClick={() => callOperation(q, 'pause')} disabled={opLoading === q.queue_id} style={secondaryBtn}>暂停</button>
                                    <button onClick={() => callOperation(q, 'complete')} disabled={opLoading === q.queue_id} style={{ ...primaryBtn, marginLeft: 8 }}>完成</button>
                                  </>
                                )}
                                {((q.execution_status || 'PENDING').toUpperCase() === 'DONE') && (
                                  <span style={{ color: '#16a34a', fontWeight: 600 }}>已完成</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {today.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 700 }}>今日执行</div>
                        {today.map((q:any, idx:number) => (
                          <div key={idx} style={{ padding: '6px 0', borderBottom: idx === today.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                            <div style={{ fontWeight: 600 }}>任务名称：{mapActionToLabel(q)}</div>
                            <div style={{ color: '#666' }}>预计耗时：{q.estimate || q.estimated_time || q.duration || '—'}</div>
                            <div style={{ marginTop: 6 }}>
                              <div style={{ color: '#374151', fontSize: 13 }}>{mapExecutionStatusLabel(q.execution_status)}</div>
                              <div style={{ marginTop: 6 }}>
                                {((q.execution_status || 'PENDING').toUpperCase() === 'PENDING') && (
                                  <button onClick={() => callOperation(q, 'start')} disabled={opLoading === q.queue_id} style={primaryBtn}>开始</button>
                                )}
                                {((q.execution_status || 'PENDING').toUpperCase() === 'RUNNING') && (
                                  <>
                                    <button onClick={() => callOperation(q, 'pause')} disabled={opLoading === q.queue_id} style={secondaryBtn}>暂停</button>
                                    <button onClick={() => callOperation(q, 'complete')} disabled={opLoading === q.queue_id} style={{ ...primaryBtn, marginLeft: 8 }}>完成</button>
                                  </>
                                )}
                                {((q.execution_status || 'PENDING').toUpperCase() === 'DONE') && (
                                  <span style={{ color: '#16a34a', fontWeight: 600 }}>已完成</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {later.length > 0 && (
                      <div>
                        <div style={{ fontWeight: 700 }}>稍后执行</div>
                        {later.map((q:any, idx:number) => (
                          <div key={idx} style={{ padding: '6px 0', borderBottom: idx === later.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                            <div style={{ fontWeight: 600 }}>任务名称：{mapActionToLabel(q)}</div>
                            <div style={{ color: '#666' }}>预计耗时：{q.estimate || q.estimated_time || q.duration || '—'}</div>
                            <div style={{ marginTop: 6 }}>
                              <div style={{ color: '#374151', fontSize: 13 }}>{mapExecutionStatusLabel(q.execution_status)}</div>
                              <div style={{ marginTop: 6 }}>
                                {((q.execution_status || 'PENDING').toUpperCase() === 'PENDING') && (
                                  <button onClick={() => callOperation(q, 'start')} disabled={opLoading === q.queue_id} style={primaryBtn}>开始</button>
                                )}
                                {((q.execution_status || 'PENDING').toUpperCase() === 'RUNNING') && (
                                  <>
                                    <button onClick={() => callOperation(q, 'pause')} disabled={opLoading === q.queue_id} style={secondaryBtn}>暂停</button>
                                    <button onClick={() => callOperation(q, 'complete')} disabled={opLoading === q.queue_id} style={{ ...primaryBtn, marginLeft: 8 }}>完成</button>
                                  </>
                                )}
                                {((q.execution_status || 'PENDING').toUpperCase() === 'DONE') && (
                                  <span style={{ color: '#16a34a', fontWeight: 600 }}>已完成</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()
            ) : (
              <div style={{ color: '#666' }}>暂无内容</div>
            )}
          </div>
        </div>

        <div>
          <h3>当前目标</h3>
          <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
            {runtime && Array.isArray(runtime.runtime_actions) ? (
              (() => {
                const ready = runtime.runtime_actions.filter((a:any) => a.status === 'READY').slice(0,3)
                if (ready.length === 0) return <div style={{ color: '#666' }}>暂无内容</div>
                return (
                  <div>
                    {ready.map((a:any, idx:number) => {
                      const name = mapActionToLabel(a)
                      const queueMatch = findQueueForAction(a)
                      const statusLabel = queueMatch ? mapExecutionStatusLabel(queueMatch.execution_status) : mapStatusLabel(a.status)
                      const est = a.estimate || a.estimated_time || '—'
                      const target = a?.payload?.target_workspace || ''
                      const targetLabel = target === 'evidence' ? '正式证据' : target === 'documents' ? '案件文书' : target === 'materials' ? '案件资料' : target
                      return (
                        <div key={a.action_id ?? idx} style={{ padding: '8px 0', borderBottom: idx === ready.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                          <div style={{ fontWeight: 600 }}>任务名称：{name}</div>
                          <div style={{ color: '#666' }}>状态：{statusLabel}</div>
                          <div style={{ color: '#666' }}>预计耗时：{est}</div>
                          <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>完成后进入：{targetLabel || '—'}</div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()
            ) : (
              <div style={{ color: '#666' }}>暂无内容</div>
            )}
          </div>
        </div>
      </div>

      {/* Fourth screen: Today's Focus + Active/Waiting Works */}
      <div style={{ marginTop: 20 }}>
        <h3>今日重点</h3>
        <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
          {runtime && Array.isArray(runtime.runtime_actions) ? (
            (() => {
              const ready = runtime.runtime_actions.filter((a:any) => a.status === 'READY').slice(0,2)
              if (ready.length === 0) return <div style={{ color: '#666' }}>暂无内容</div>
              return (
                <div>
                      {ready.map((a:any, idx:number) => {
                        const type = String(a.type || '')
                        const payloadWorkspace = a?.payload?.target_workspace
                        let href = `/${params.matter_id}`

                        if (payloadWorkspace) {
                          if (payloadWorkspace === 'evidence') href = `/matters/${params.matter_id}/evidence`
                          else if (payloadWorkspace === 'documents') href = `/matters/${params.matter_id}/documents`
                          else if (payloadWorkspace === 'runtime') href = `/matters/${params.matter_id}/runtime`
                        } else {
                          if (type === 'PrepareEvidenceAction') href = `/matters/${params.matter_id}/evidence`
                          else if (type === 'PrepareResearchAction') href = `/matters/${params.matter_id}/runtime`
                          else if (type === 'PrepareDocumentAction') href = `/matters/${params.matter_id}/documents`
                          else if (type === 'MonitorMatterAction') href = `/matters/${params.matter_id}/runtime`
                        }

                        const queueMatch = findQueueForAction(a)
                        const statusLabel = queueMatch ? mapExecutionStatusLabel(queueMatch.execution_status) : mapStatusLabel(a.status)

                        return (
                          <div key={a.action_id ?? idx} style={{ padding: '8px 0', borderBottom: idx === ready.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <div style={{ fontWeight: 600 }}>{mapActionToLabel(a)}</div>
                              <div><a href={href} style={{ color: '#2563eb', fontSize: 13 }}>打开</a></div>
                            </div>
                            <div style={{ color: '#666' }}>{statusLabel}</div>
                            <div style={{ color: '#9ca3af', fontSize: 11 }} />
                          </div>
                        )
                      })}
                  <div style={{ marginTop: 8 }}><a href={`/matters/${params.matter_id}/runtime`} style={{ color: '#2563eb' }}>查看完整运行时</a></div>
                </div>
              )
            })()
          ) : (
            <div style={{ color: '#666' }}>No ready actions</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <h3>进行中</h3>
          <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
            {runtime && Array.isArray(runtime.runtime_works) ? (
              (() => {
                const active = runtime.runtime_works.filter((w:any) => String(w.status).toUpperCase() === 'PENDING')
                if (active.length === 0) return <div style={{ color: '#666' }}>暂无内容</div>
                return (
                  <div>
                    {active.map((w:any, idx:number) => (
                      <div key={w.work_id ?? idx} style={{ padding: '8px 0', borderBottom: idx === active.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                        <div style={{ fontWeight: 600 }}>{mapWorkTitle(w.title) || w.title || ''}</div>
                        <div style={{ color: '#666' }}>{mapWorkTypeLabel(w.type)}</div>
                        <div style={{ color: '#9ca3af', fontSize: 11 }}>{(() => {
                          const q = findQueueForWork(w)
                          return q ? mapExecutionStatusLabelForActiveWork(q.execution_status) : mapStatusLabel(w.status)
                        })()}</div>
                      </div>
                    ))}
                  </div>
                )
              })()
            ) : (
              <div style={{ color: '#666' }}>暂无内容</div>
            )}
          </div>
        </div>

        <div>
          <h3>等待中</h3>
          <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
            {runtime && Array.isArray(runtime.runtime_works) ? (
              (() => {
                const waiting = runtime.runtime_works.filter((w:any) => String(w.status).toUpperCase() === 'BLOCKED')
                if (waiting.length === 0) return <div style={{ color: '#666' }}>暂无内容</div>
                return (
                  <div>
                    {waiting.map((w:any, idx:number) => (
                      <div key={w.work_id ?? idx} style={{ padding: '8px 0', borderBottom: idx === waiting.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                        <div style={{ fontWeight: 600 }}>{w.title || ''}</div>
                        <div style={{ color: '#666' }}>类型：{w.type}</div>
                        <div style={{ color: '#9ca3af', fontSize: 11 }}>状态：{w.status}</div>
                      </div>
                    ))}
                  </div>
                )
              })()
            ) : (
              <div style={{ color: '#666' }}>暂无内容</div>
            )}
          </div>
        </div>
      </div>

      {/* Fifth screen: Recent Activity + Recent lists */}
      <div style={{ marginTop: 20 }}>
        <h3>最近活动</h3>
        {recentActivity.length > 0 ? (
          <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
            {recentActivity.map((a:any, idx:number) => (
              <div key={idx} style={{ padding: '8px 0', borderBottom: idx === recentActivity.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: 600 }}>{a.title}</div>
                <div style={{ color: '#666' }}>{a.description}</div>
                <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 6 }}>{new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#666' }}>暂无内容</div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
        <RecentList title="最近资料" items={data.recent_materials} renderItem={(m:any)=> (
          <>
            <div style={{ fontWeight: 600 }}>{m.title || m.name || 'Untitled'}</div>
            <div style={{ color: '#666', fontSize: 12 }}>{m.material_type || m.source || ''}</div>
          </>
        )} />

        <RecentList title="最近证据" items={data.recent_evidence} renderItem={(e:any)=> (
          <>
            <div style={{ fontWeight: 600 }}>{e.title || 'Untitled'}</div>
            <div style={{ color: '#666', fontSize: 12 }}>{e.evidence_type || ''}</div>
          </>
        )} />

        <RecentList title="最近文书" items={data.recent_documents} renderItem={(d:any)=> (
          <>
            <div style={{ fontWeight: 600 }}>{d.title || 'Untitled'}</div>
            <div style={{ color: '#666', fontSize: 12 }}>{d.document_type || ''} · {d.version || ''}</div>
          </>
        )} />
      </div>
    </main>
  )
}
