"use client"
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Workspace = {
  matter: { matter_id: string; title?: string; status?: string }
  summary: { materials: number; evidence: number; documents: number; pending_ai_suggestions: number }
  recent_materials: any[]
  recent_evidence: any[]
  recent_documents: any[]
  recent_activity?: any[]
}

// Visual design tokens (M39.7)
const tokens = {
  blue: '#2563eb',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  pageBg: '#f8fafc',
  cardBg: '#ffffff',
  radius: 16,
  shadow: '0 8px 24px rgba(2,6,23,0.04)',
  spacing: 16,
}

function TwoLineTitle({ zh, en, size = 'md' }: { zh: string; en?: string; size?: 'xl' | 'lg' | 'md' | 'sm' }) {
  const sizes: Record<string, { zh: number; en: number; gap: number }> = {
    xl: { zh: 24, en: 14, gap: 2 },
    lg: { zh: 20, en: 12, gap: 2 },
    md: { zh: 16, en: 10, gap: 2 },
    sm: { zh: 14, en: 9, gap: 1 },
  }
  const s = sizes[size] || sizes.md
  return (
    <div style={{ lineHeight: 1.05 }}>
      <div style={{ fontSize: s.zh, fontWeight: 800, color: tokens.text, margin: 0 }}>{zh}</div>
      {en ? <div style={{ fontSize: s.en, fontWeight: 400, color: tokens.muted, marginTop: s.gap }}>{en}</div> : null}
    </div>
  )
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div style={{ padding: tokens.spacing, borderRadius: tokens.radius, background: tokens.cardBg, border: `1px solid ${tokens.border}`, minWidth: 140 }}>
      <div style={{ fontSize: 12, color: tokens.muted }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: tokens.text }}>{value === 0 ? '—' : value}</div>
    </div>
  )
}

function RecentList({ title, items, renderItem }: { title: string; items: any[]; renderItem: (it: any) => React.ReactNode }) {
  return (
    <div style={{ background: tokens.cardBg, padding: tokens.spacing, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
      <div style={{ marginTop: 0 }}><TwoLineTitle zh={title} size="md" /></div>
      {items.length === 0 && <div style={{ color: tokens.muted }}>—</div>}
      {items.map((it, idx) => (
        <div key={it.material_id ?? it.evidence_id ?? it.document_id ?? idx} style={{ padding: 8, borderBottom: `1px solid ${tokens.border}` }}>
          {renderItem(it)}
        </div>
      ))}
    </div>
  )
}

// Small TimelineItem component required by the page
function TimelineItem({ title, time }: { title: string; time?: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 10, height: 10, background: tokens.blue, borderRadius: '50%', marginTop: 6 }} />
      <div>
        <div style={{ fontWeight: 600 }}>{title}</div>
        {time ? <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>{String(time)}</div> : null}
      </div>
    </div>
  )
}

function TaskCard({ title, status, estimate, onStart }: { title: string; status?: string; estimate?: string; onStart?: () => void }) {
  const statusLabel = String(status || 'PENDING').toUpperCase() === 'RUNNING' ? '进行中' : String(status || 'PENDING').toUpperCase() === 'DONE' ? '已完成' : '等待中'
  return (
    <div style={{ background: tokens.cardBg, padding: tokens.spacing, borderRadius: tokens.radius, border: `1px solid ${tokens.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: tokens.shadow }}>
      <div>
        <div style={{ fontWeight: 700, color: tokens.text }}>{title}</div>
        <div style={{ color: tokens.muted, fontSize: 13, marginTop: 6 }}>{statusLabel} · 预计：{estimate || '—'}</div>
      </div>
      <div>
        <button onClick={onStart} style={{
          background: tokens.blue,
          color: '#fff',
          border: `1px solid ${tokens.blue}`,
          borderRadius: 12,
          padding: '8px 14px',
          fontWeight: 600,
          cursor: 'pointer'
        }}>
          开始
        </button>
      </div>
    </div>
  )
}

// Rich task card for Today Tasks (M39.2)
function RichTaskCard({
  title,
  why,
  estimate,
  taskMatch,
  onStart,
  onComplete,
}: {
  title: string
  why: string
  estimate: string
  taskMatch?: any
  onStart: (matched?: any) => void
  onComplete?: (matched?: any) => void
}) {
  const statusLabel = taskMatch ? mapTaskStatusLabel(taskMatch.execution_status) : '等待中'
  return (
    <div style={{ background: tokens.cardBg, padding: tokens.spacing + 2, borderRadius: tokens.radius, border: `1px solid ${tokens.border}`, boxShadow: tokens.shadow, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: tokens.text }}>{title}</div>
        <div style={{ color: tokens.muted, marginTop: 8 }}>{why}</div>
        <div style={{ color: tokens.muted, marginTop: 10, fontSize: 13 }}>预计耗时：{estimate}</div>
        <div style={{ color: tokens.text, marginTop: 8, fontWeight: 600 }}>{statusLabel}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        <div>
          {(() => {
            const exec = taskMatch ? String(taskMatch.execution_status || taskMatch.status || '').toUpperCase() : ''
            const isDone = exec === 'DONE'
            const isRunning = exec === 'RUNNING'
            const isPending = exec === 'PENDING' || exec === 'READY' || exec === ''

            return (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => onStart(taskMatch)}
                  disabled={isRunning || isDone}
                  style={{
                    background: isPending ? tokens.blue : tokens.cardBg,
                    color: isPending ? '#fff' : tokens.text,
                    border: `1px solid ${isPending ? tokens.blue : tokens.border}`,
                    borderRadius: 12,
                    padding: '8px 14px',
                    fontWeight: 600,
                    cursor: isRunning || isDone ? 'not-allowed' : 'pointer',
                    opacity: isRunning || isDone ? 0.6 : 1,
                  }}
                >
                  开始
                </button>

                <button
                  onClick={() => (typeof onComplete === 'function' ? onComplete(taskMatch) : undefined)}
                  disabled={isPending || isDone}
                  style={{
                    background: isRunning ? tokens.blue : tokens.cardBg,
                    color: isRunning ? '#fff' : tokens.text,
                    border: `1px solid ${isRunning ? tokens.blue : tokens.border}`,
                    borderRadius: 12,
                    padding: '8px 14px',
                    fontWeight: 600,
                    cursor: isPending || isDone ? 'not-allowed' : 'pointer',
                    opacity: isPending || isDone ? 0.6 : 1,
                  }}
                >
                  完成
                </button>
              </div>
            )
          })()}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => alert(why)} style={{ background: tokens.cardBg, color: tokens.blue, border: `1px solid ${tokens.border}`, borderRadius: 12, padding: '6px 10px', cursor: 'pointer' }}>查看说明</button>
          <button onClick={() => alert('已标记为稍后处理')} style={{ background: tokens.cardBg, color: tokens.text, border: `1px solid ${tokens.border}`, borderRadius: 12, padding: '6px 10px', cursor: 'pointer' }}>稍后处理</button>
        </div>
      </div>
    </div>
  )
}

function mapTaskStatusLabel(s?: string) {
  const v = String(s || 'PENDING').toUpperCase()
  if (v === 'PENDING') return '等待中'
  if (v === 'RUNNING') return '进行中'
  if (v === 'DONE') return '已完成'
  return s || '等待中'
}

function formatWaitingForDisplay(value: any): string {
  if (value == null) return '无'
  if (typeof value === 'string') return value.trim() || '无'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    const text = value
      .map((it) => formatWaitingForDisplay(it))
      .filter((s) => s && s !== '无')
      .join('，')
    return text || '无'
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, any>
    const candidate = obj.title ?? obj.summary ?? obj.reason ?? obj.message ?? obj.lawyer_action
    if (candidate == null) return '无'
    return formatWaitingForDisplay(candidate)
  }
  return '无'
}

function TimelineNode({ idx, title, state }: { idx: number; title: string; state: 'done' | 'current' | 'future' }) {
  const color = state === 'done' ? tokens.blue : state === 'current' ? '#0ea5a4' : '#cbd5e1'
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 14, height: 14, background: color, borderRadius: '50%', marginTop: 4 }} />
      <div>
        <div style={{ fontWeight: state === 'current' ? 800 : 600, color: tokens.text }}>{title}</div>
      </div>
    </div>
  )
}

export default function MatterWorkspacePage() {
  const params = useParams() as { matter_id: string }
  const router = useRouter()

  const [materials, setMaterials] = useState<any[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [evidenceCount, setEvidenceCount] = useState<number>(0)
  const [matterTitle, setMatterTitle] = useState<string>('')
  const [matterStatus, setMatterStatus] = useState<string>('')
  const [clientName, setClientName] = useState<string | null>(null)
  const [counts, setCounts] = useState<{ materials: number; evidence: number; facts: number; issues: number; laws: number; arguments: number; documents: number }>({ materials: 0, evidence: 0, facts: 0, issues: 0, laws: 0, arguments: 0, documents: 0 })
  const [facts, setFacts] = useState<any[]>([])
  const [issues, setIssues] = useState<any[]>([])
  const [laws, setLaws] = useState<any[]>([])
  const [argumentsList, setArgumentsList] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])

  // Dynamic values populated from backend
  const caseName = matterTitle || ''
  const client = clientName ?? '未填写'
  const stage = matterStatus || '进行中'
  const status = matterStatus || '进行中'

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e6e7eb',
    padding: 20,
    borderRadius: 12,
  }

  useEffect(() => {
    let mounted = true
    async function loadAll() {
      if (!params?.matter_id) return
      setLoadingMaterials(true)
      const API = (process.env.NEXT_PUBLIC_API_BASE_URL as string) || 'http://localhost:4000'
      const endpoints = {
        matter: `${API}/matters/${encodeURIComponent(params.matter_id)}`,
        materials: `${API}/matters/${encodeURIComponent(params.matter_id)}/materials`,
        evidence: `${API}/matters/${encodeURIComponent(params.matter_id)}/evidence`,
        facts: `${API}/matters/${encodeURIComponent(params.matter_id)}/facts`,
        issues: `${API}/matters/${encodeURIComponent(params.matter_id)}/issues`,
        laws: `${API}/matters/${encodeURIComponent(params.matter_id)}/laws`,
        arguments: `${API}/matters/${encodeURIComponent(params.matter_id)}/arguments`,
        documents: `${API}/matters/${encodeURIComponent(params.matter_id)}/documents`,
      }

      try {
        const settled = await Promise.allSettled(Object.values(endpoints).map((u) => fetch(u).catch((e) => null)))
        if (!mounted) return

        // matter
        try {
          const mResp = settled[0].status === 'fulfilled' && settled[0].value && settled[0].value.ok ? await (settled[0] as any).value.json() : null
          if (mResp && typeof mResp === 'object') {
            setMatterTitle(mResp.title || '')
            setMatterStatus(mResp.status || '')
            setClientName((mResp.client && (mResp.client.name || mResp.client)) || null)
          }
        } catch (e) {
          // ignore
        }

        // helper to parse arrays
        const parseArr = async (idx: number) => {
          try {
            const r = (settled[idx] as any).value
            if (r && r.ok) {
              const j = await r.json().catch(() => null)
              return Array.isArray(j) ? j : []
            }
          } catch (e) { }
          return []
        }

        const materialsArr = await parseArr(1)
        const evidenceArr = await parseArr(2)
        const factsArr = await parseArr(3)
        const issuesArr = await parseArr(4)
        const lawsArr = await parseArr(5)
        const argsArr = await parseArr(6)
        const docsArr = await parseArr(7)

        if (!mounted) return
        setMaterials(materialsArr)
        setEvidenceCount(Array.isArray(evidenceArr) ? evidenceArr.length : 0)
        setCounts({ materials: materialsArr.length, evidence: evidenceArr.length, facts: factsArr.length, issues: issuesArr.length, laws: lawsArr.length, arguments: argsArr.length, documents: docsArr.length })
        setFacts(factsArr)
        setIssues(issuesArr)
        setLaws(lawsArr)
        setArgumentsList(argsArr)
        setDocuments(docsArr)
      } catch (e) {
        console.error('loadAll failed', e)
        if (mounted) {
          setMaterials([])
          setEvidenceCount(0)
          setCounts({ materials: 0, evidence: 0, facts: 0, issues: 0, laws: 0, arguments: 0, documents: 0 })
        }
      } finally {
        if (mounted) setLoadingMaterials(false)
      }
    }

    loadAll()
    return () => { mounted = false }
  }, [params?.matter_id])

  const primaryBtn: React.CSSProperties = {
    background: '#111827',
    color: '#ffffff',
    border: 'none',
    padding: '10px 14px',
    borderRadius: 8,
    fontWeight: 700,
    cursor: 'pointer',
  }

  const secondaryBtn: React.CSSProperties = {
    background: '#fff',
    color: '#111827',
    border: '1px solid #e6e7eb',
    padding: '10px 14px',
    borderRadius: 8,
    fontWeight: 700,
    cursor: 'pointer',
  }

  return (
    <main style={{ padding: 32, background: '#ffffff', color: '#0f172a', minHeight: '80vh' }}>
      {/* 案件资料区域 */}
      <section style={{ marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #e6e7eb', padding: 20, borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>案件资料</div>
          <div style={{ color: '#374151' }}>
            {loadingMaterials ? (
              <div style={{ color: '#64748b' }}>加载中…</div>
            ) : materials && materials.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {materials.map((m: any, i: number) => {
                  const filename = m.title || m.name || (m.storage_uri ? m.storage_uri.split('/').pop() : '未知文件')
                  const filetype = m.material_type || m.type || (m.storage_uri ? (m.storage_uri.split('.').pop() || '-') : '-')
                  const size = m.size || m.file_size || '-'
                  const time = m.created_at || m.updated_at || null
                  return (
                    <li key={m.material_id ?? i} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 600 }}>{filename}</div>
                      <div style={{ color: '#6b7280', fontSize: 13 }}>{filetype} • {typeof size === 'number' ? `${(size / 1024).toFixed(1)} KB` : size} • {time ? new Date(time).toLocaleString() : '-'}</div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div style={{ color: '#6b7280' }}>暂无案件资料</div>
            )}
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => router.push(`/matters/${params.matter_id}/evidence`)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e7eb', background: '#fff', color: '#111827', fontWeight: 700 }}>查看资料</button>
            </div>
          </div>
        </div>
      </section>
      {/* Card 1: 案件概况 */}
      <section style={{ marginBottom: 24 }}>
        <div style={{ ...cardStyle }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>案件概况</div>
          <div style={{ color: '#374151', lineHeight: 1.8 }}>
            <div>案件名称：{caseName}</div>
            <div>委托人：{client}</div>
            <div>案件阶段：{stage}</div>
            <div>案件状态：{status}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
              <SummaryCard title="Materials" value={materials.length} />
              <SummaryCard title="Evidence" value={evidenceCount} />
            </div>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        {/* Card 2: 下一步建议 (视觉中心) */}
        <div>
          <div style={{ ...cardStyle, minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>下一步建议</div>
            <div style={{ color: '#374151', lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>建议今天完成：</div>
              <ol style={{ marginLeft: 18 }}>
                <li>① 上传银行流水</li>
                <li>② 上传微信聊天记录</li>
                <li>③ 补充借条</li>
              </ol>

              <div style={{ marginTop: 12, fontWeight: 700 }}>预计耗时：</div>
              <div style={{ marginTop: 6 }}>20 分钟</div>
            </div>
          </div>
        </div>

        {/* Right column: Card 3 (当前资料) and Card 4 (开始今天工作) */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...cardStyle }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>当前资料</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#374151' }}>
              <li style={{ marginBottom: 8 }}>✓ 客户资料</li>
              <li style={{ marginBottom: 8 }}>✓ 委托合同</li>
              <li style={{ marginBottom: 8 }}>□ 银行流水</li>
              <li style={{ marginBottom: 8 }}>□ 微信聊天记录</li>
              <li style={{ marginBottom: 8 }}>□ 借条</li>
              <li style={{ marginBottom: 8 }}>□ 录音</li>
            </ul>
          </div>

          <div style={{ ...cardStyle }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>开始今天工作</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => router.push(`/matters/${params.matter_id}/documents`)} style={primaryBtn}>上传资料</button>
              <button onClick={() => router.push(`/matters/${params.matter_id}/research`)} style={secondaryBtn}>法律检索</button>
              <button onClick={() => router.push(`/matters/${params.matter_id}/documents`)} style={secondaryBtn}>生成文书</button>
            </div>
          </div>
        </aside>
      </div>
      {/* 下一步 按钮 */}
      <div style={{ padding: 24, background: '#ffffff', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center' }}>
        <button onClick={() => router.push(`/matters/${params.matter_id}/evidence`)} style={{ width: '720px', maxWidth: '90%', padding: '12px 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800 }}>下一步：证据整理</button>
      </div>
    </main>
  )
}
