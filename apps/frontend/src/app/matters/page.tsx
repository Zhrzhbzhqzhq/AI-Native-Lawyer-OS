"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiUrl } from '../../lib/api'

type Matter = {
  id: string
  matter_id: string
  title: string
  description: string
  matter_type: string
  status: string
  stage: string | null
  priority?: string | null
  risk_level?: string | null
  ai_status?: string | null
  runtime_status?: string | null
  ai_state?: string | null
  current_focus?: string | null
  next_action?: string | null
  ai_next_action?: string | null
  ai_summary?: string | null
  next_deadline?: string | null
  created_at: string
  updated_at: string
  closed_at: string | null
  archived_at: string | null
}

type TodayDashboard = {
  completed: any[]
  waiting: any[]
  nextActions: any[]
  activeMatters: any[]
}

type TodayRuntime = {
  review: any[]
  ready: any[]
  handle: any[]
  completed: any[]
  risks: any[]
}

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === 'object' && !Array.isArray(value)) }
function isNonEmptyString(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0 }
function isFiniteNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) }
function isOptionalString(value: unknown): boolean { return value === undefined || typeof value === 'string' }
function isOptionalDate(value: unknown): boolean { return value === undefined || value === null || typeof value === 'string' }
function isDate(value: unknown): boolean { return value === null || typeof value === 'string' }
function isOptionalBoolean(value: unknown): boolean { return value === undefined || typeof value === 'boolean' }
function isOptionalFiniteNumber(value: unknown): boolean { return value === undefined || isFiniteNumber(value) }
function isNullableString(value: unknown): boolean { return value === null || typeof value === 'string' }
function isValidDateString(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0 && Number.isFinite(new Date(value).getTime()) }
function isNullableDateString(value: unknown): boolean { return value === null || isValidDateString(value) }

function isMatter(value: unknown): value is Matter {
  if (!isRecord(value)) return false
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.matter_id) || typeof value.title !== 'string') return false
  if (typeof value.description !== 'string' || typeof value.matter_type !== 'string' || typeof value.status !== 'string' || !isNullableString(value.stage)) return false
  if (!isValidDateString(value.created_at) || !isValidDateString(value.updated_at) || !isNullableDateString(value.closed_at) || !isNullableDateString(value.archived_at)) return false
  const optionalTextFields = ['priority', 'risk_level', 'ai_status', 'runtime_status', 'ai_state', 'current_focus', 'next_action', 'ai_next_action', 'ai_summary']
  if (!optionalTextFields.every((key) => value[key] === undefined || isNullableString(value[key]))) return false
  if (value.next_deadline !== undefined && !isNullableDateString(value.next_deadline)) return false
  return true
}

function isMatterList(value: unknown): value is Matter[] { return Array.isArray(value) && value.every(isMatter) }

function isCompletedItem(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.matterId) && isNonEmptyString(value.matterTitle) && isNonEmptyString(value.title) && isNonEmptyString(value.type) && isNonEmptyString(value.sourceStatus) && isDate(value.completedAt)
}

function isWaitingItem(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.matterId) && isNonEmptyString(value.matterTitle) && isNonEmptyString(value.title) && isNonEmptyString(value.type) && isNonEmptyString(value.waitingReason) && isNonEmptyString(value.sourceStatus) && isOptionalString(value.waitingType) && isOptionalFiniteNumber(value.priority) && isOptionalBoolean(value.needsLawyerAction) && isDate(value.updatedAt)
}

function isNextActionItem(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.matterId) && isNonEmptyString(value.matterTitle) && isNonEmptyString(value.action) && isNonEmptyString(value.reason) && isNonEmptyString(value.priority) && isFiniteNumber(value.etaMinutes) && isNonEmptyString(value.source)
}

function isActiveMatterItem(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && isNonEmptyString(value.matterId) && isNonEmptyString(value.matterTitle) && isNonEmptyString(value.matterStatus) && isNonEmptyString(value.priority) && isNonEmptyString(value.stageHint) && isFiniteNumber(value.waitingCount) && isFiniteNumber(value.nextActionCount) && isDate(value.updatedAt)
}

function isRuntimeItem(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  const hasId = isNonEmptyString(value.task_id) || isNonEmptyString(value.id)
  return hasId && isNonEmptyString(value.matter_id) && isNonEmptyString(value.title) && isNonEmptyString(value.status) && isNonEmptyString(value.nextAction) && isNonEmptyString(value.reason) && isOptionalString(value.task_type) && isOptionalString(value.type) && isOptionalString(value.priority) && isOptionalDate(value.due_date) && isOptionalDate(value.created_at) && isOptionalDate(value.updated_at) && isOptionalBoolean(value.needsLawyerAction) && isOptionalFiniteNumber(value.progress)
}

function isTodayDashboard(value: unknown): value is TodayDashboard {
  if (!isRecord(value) || !Array.isArray(value.completed) || !Array.isArray(value.waiting) || !Array.isArray(value.nextActions) || !Array.isArray(value.activeMatters)) return false
  if (!isDate(value.generatedAt) || !isRecord(value.summary) || !isRecord(value.meta)) return false
  const summary = value.summary
  const meta = value.meta
  if (!['completedCount', 'waitingCount', 'nextActionsCount', 'activeMattersCount'].every((key) => isFiniteNumber(summary[key]))) return false
  if (!isNonEmptyString(meta.dataVersion) || typeof meta.partial !== 'boolean' || !Array.isArray(meta.warnings) || !meta.warnings.every((warning) => typeof warning === 'string')) return false
  return value.completed.every(isCompletedItem) && value.waiting.every(isWaitingItem) && value.nextActions.every(isNextActionItem) && value.activeMatters.every(isActiveMatterItem)
}

function isTodayRuntime(value: unknown): value is TodayRuntime {
  if (!isRecord(value) || !Array.isArray(value.review) || !Array.isArray(value.ready) || !Array.isArray(value.handle) || !Array.isArray(value.completed) || !Array.isArray(value.risks)) return false
  return value.review.every(isRuntimeItem) && value.ready.every(isRuntimeItem) && value.handle.every(isRuntimeItem) && value.completed.every(isRuntimeItem) && value.risks.every(isRuntimeItem)
}

function normalizeDisplayText(value: unknown): string {
  if (value === null || value === undefined) return '暂无内容'
  const text = String(value).trim()
  if (!text) return '暂无内容'

  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const candidate = parsed.summary || parsed.next_action || parsed.next || parsed.title || parsed.reason
        if (typeof candidate === 'string' && candidate.trim()) return normalizeDisplayText(candidate)
        return 'AI 结果待确认'
      }

      return Array.isArray(parsed) && parsed.length === 0 ? '暂无内容' : 'AI 结果待确认'
    } catch (err) {
      return 'AI 结果待确认'
    }
  }

  return text
}

function getMatterId(item: any): string {
  return item?.matterId || item?.matter_id || item?.matter?.matter_id || ''
}

function getMatterTitle(item: any): string {
  return item?.matterTitle || item?.matter_title || item?.matter?.title || item?.title || ''
}

function toPriorityRank(value: unknown): number {
  const text = String(value || '').toUpperCase()
  if (text.includes('P1') || text.includes('★★★★★')) return 1
  if (text.includes('P2') || text.includes('★★★★')) return 2
  if (text.includes('P3') || text.includes('★★★')) return 3
  return 9
}

function toTime(value: unknown): number {
  const time = new Date(String(value || '')).getTime()
  return Number.isNaN(time) ? 0 : time
}

export default function MattersPage() {
  const [matters, setMatters] = useState<Matter[]>([])
  const [dashboard, setDashboard] = useState<TodayDashboard | null>(null)
  const [runtime, setRuntime] = useState<TodayRuntime | null>(null)
  const [loading, setLoading] = useState(false)
  const [mattersError, setMattersError] = useState<string | null>(null)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  // Keep original fetch/create/delete logic available but hide DB fields from UI
  async function fetchMatters() {
    setLoading(true)
    setMattersError(null)
    try {
      const res = await fetch(apiUrl('/matters'))
      if (!res.ok) throw new Error('request_failed')
      const data = await res.json().catch(() => { throw new Error('invalid_json') })
      const list = Array.isArray(data) ? data : data?.matters
      if (!isMatterList(list)) throw new Error('invalid_structure')
      setMatters(list)
    } catch (error: any) {
      setMattersError(error?.message === 'invalid_json' || error?.message === 'invalid_structure' ? '案件列表返回数据暂不可用' : '案件列表加载失败')
    } finally {
      setLoading(false)
    }
  }

  async function fetchToday() {
    setDashboardError(null)
    setRuntimeError(null)
    const loadDashboard = async () => {
      try {
        const response = await fetch(apiUrl('/today/dashboard'))
        if (!response.ok) throw new Error('request_failed')
        const data = await response.json().catch(() => { throw new Error('invalid_response') })
        if (!isTodayDashboard(data)) throw new Error('invalid_response')
        setDashboard(data)
      } catch (error: any) {
        setDashboardError(error?.message === 'invalid_response' ? 'Today Dashboard 返回数据暂不可用' : 'Today Dashboard 加载失败')
      }
    }
    const loadRuntime = async () => {
      try {
        const response = await fetch(apiUrl('/today/runtime'))
        if (!response.ok) throw new Error('request_failed')
        const data = await response.json().catch(() => { throw new Error('invalid_response') })
        if (!isTodayRuntime(data)) throw new Error('invalid_response')
        setRuntime(data)
      } catch (error: any) {
        setRuntimeError(error?.message === 'invalid_response' ? 'Today Runtime 返回数据暂不可用' : 'Today Runtime 加载失败')
      }
    }
    await Promise.all([loadDashboard(), loadRuntime()])
  }

  useEffect(() => {
    fetchMatters()
    fetchToday()
  }, [])

  // Render every Matter returned by the backend.
  const sourceMatters = matters && matters.length > 0 ? matters : []

  // UI-friendly list derived from backend matters
  const displayMatters = sourceMatters.map((m) => ({
    matter_id: m.matter_id,
    title: m.title,
    status: m.stage ?? m.status,
    ai_status: m.ai_status ?? m.runtime_status ?? m.ai_state ?? null,
    next_step: m.next_action ?? m.ai_next_action ?? null,
    priority: m.priority ?? null,
    created_at: m.created_at,
    updated_at: m.updated_at,
  }))

  const activeDashboardMatters = Array.isArray(dashboard?.activeMatters)
    ? dashboard.activeMatters
    : []
  const waitingItems = Array.isArray(dashboard?.waiting)
    ? dashboard.waiting
    : []
  const completedItems = [
    ...(Array.isArray(dashboard?.completed) ? dashboard.completed : []),
    ...(Array.isArray(runtime?.completed) ? runtime.completed : []),
  ]
  const progressingItems = [
    ...(Array.isArray(runtime?.handle) ? runtime.handle : []),
    ...(Array.isArray(runtime?.ready) ? runtime.ready : []),
  ]

  const topMatterSource = [...activeDashboardMatters]
    .sort((a, b) => toPriorityRank(a?.priority) - toPriorityRank(b?.priority) || toTime(b?.updatedAt) - toTime(a?.updatedAt))[0]
  const aiTopImportant = topMatterSource ? {
    matterId: topMatterSource.matterId,
    stars: topMatterSource.priority,
    title: normalizeDisplayText(topMatterSource.matterTitle),
    stage: normalizeDisplayText(topMatterSource.stageHint),
    reason: normalizeDisplayText(topMatterSource.nextActionCount > 0 ? `有 ${topMatterSource.nextActionCount} 个下一步建议` : topMatterSource.stageHint),
  } : null

  // basic dashboard stats derived from backend data
  const stats: Record<string, number | string> = {
    inProgress: mattersError ? '—' : displayMatters.length,
    todayTodo: dashboardError ? '—' : waitingItems.length,
    aiAdvancing: dashboardError || runtimeError ? '—' : progressingItems.length || activeDashboardMatters.length,
    weekCourts: '—',
  }

  const router = useRouter()
  function openMatterLink(matter_id: string) {
    router.push(`/matters/${encodeURIComponent(matter_id)}`)
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => router.push('/')} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 14, padding: 0, cursor: 'pointer' }}>← 返回今日工作台</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>案件中心</h1>
          <div style={{ marginTop: 6, color: '#64748b' }}>AI 正在协助管理和推进你的案件。</div>
          <div style={{ marginTop: 12 }}>
            <input placeholder="🔍 搜索案件、客户、案号……" style={{ width: 420, padding: '8px 10px', borderRadius: 8, border: '1px solid #e6eef6' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => router.push('/intake')} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, fontSize: 16 }}>＋ 新建案件</button>
        </div>
      </div>
      {mattersError ? <div style={{ marginTop: 12, color: '#b91c1c' }}>{mattersError}<button onClick={fetchMatters} style={{ marginLeft: 12 }}>重新加载案件列表</button></div> : null}
      {dashboardError ? <div style={{ marginTop: 12, color: '#b91c1c' }}>{dashboardError}<button onClick={fetchToday} style={{ marginLeft: 12 }}>重新加载 Today Dashboard</button></div> : null}
      {runtimeError ? <div style={{ marginTop: 12, color: '#b91c1c' }}>{runtimeError}<button onClick={fetchToday} style={{ marginLeft: 12 }}>重新加载 Today Runtime</button></div> : null}

      {/* Top stats */}
      <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
        <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e6eef6', minWidth: 160 }}>
          <div style={{ color: '#64748b' }}>进行中案件</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{stats.inProgress}</div>
        </div>
        <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e6eef6', minWidth: 160 }}>
          <div style={{ color: '#64748b' }}>今日待处理</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{stats.todayTodo}</div>
        </div>
        <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e6eef6', minWidth: 160 }}>
          <div style={{ color: '#64748b' }}>AI 正在推进</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{stats.aiAdvancing}</div>
        </div>
        <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e6eef6', minWidth: 160 }}>
          <div style={{ color: '#64748b' }}>本周开庭</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{stats.weekCourts}</div>
        </div>
      </div>

      {/* Main content: list + right panel */}
      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>
        <div>
          <div style={{ background: '#fff', border: '1px solid #e6eef6', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>案件</div>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
              {displayMatters.map((m) => (
                <div key={m.matter_id} onClick={() => openMatterLink(m.matter_id)} style={{ background: '#fff', border: '1px solid #e6eef6', borderRadius: 12, padding: 16, height: 240, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{m.priority ?? '—'}</div>
                    <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                  </div>

                  <div style={{ marginTop: 8, flex: 1, overflowY: 'auto' }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: 12 }}>当前阶段</div>
                      <div style={{ marginTop: 4, color: '#0f172a', fontSize: 13 }}>{m.status}</div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <div style={{ color: '#64748b', fontSize: 12 }}>AI 状态</div>
                      <div style={{ marginTop: 4, color: '#0f172a', fontSize: 13, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.ai_status ?? '—'}</div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <div style={{ color: '#64748b', fontSize: 12 }}>下一步</div>
                      <div style={{ marginTop: 4, color: '#0f172a', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.next_step ?? '—'}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); openMatterLink(m.matter_id) }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                      style={{
                        width: 'fit-content',
                        height: 30,
                        padding: '0 10px',
                        fontSize: 13,
                        fontWeight: 500,
                        borderRadius: 6,
                        background: '#fff',
                        border: '1px solid #2563eb',
                        color: '#2563eb',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      查看
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* footer: recent 10 and view all */}
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#64748b' }}>显示最近 10 个案件</div>
            <button style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: 8 }}>查看全部案件（{displayMatters.length}）</button>
          </div>
        </div>

        <aside>
          {/* AI Chief consolidated */}
          <div style={{ background: '#fff', border: '1px solid #e6eef6', borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>AI Chief</div>

            {/* 今天最重要 */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 700 }}>今天最重要</div>
              {dashboardError ? (
                <div style={{ marginTop: 8, color: '#b91c1c' }}>Today Dashboard 加载失败</div>
              ) : dashboard === null ? (
                <div style={{ marginTop: 8, color: '#64748b' }}>加载中…</div>
              ) : aiTopImportant ? (
                <>
                  <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800 }}>{normalizeDisplayText(aiTopImportant.stars)}</div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>{aiTopImportant.title}</div>
                  <div style={{ marginTop: 4, color: '#64748b' }}>{aiTopImportant.stage}</div>
                  <div style={{ marginTop: 4, color: '#64748b' }}>{aiTopImportant.reason}</div>
                </>
              ) : (
                <div style={{ marginTop: 8, color: '#64748b' }}>暂无重点案件</div>
              )}
              <div style={{ marginTop: 8 }}>
                <button disabled={!aiTopImportant || Boolean(dashboardError)} onClick={() => aiTopImportant && !dashboardError ? openMatterLink(aiTopImportant.matterId) : undefined} style={{ background: aiTopImportant && !dashboardError ? '#2563eb' : '#94a3b8', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: 8, cursor: aiTopImportant && !dashboardError ? 'pointer' : 'not-allowed' }}>立即处理</button>
              </div>
            </div>

            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #f1f5f9' }} />

            {/* AI 正在推进 */}
            <div>
              <div style={{ fontWeight: 700 }}>AI 正在推进</div>
              <div style={{ marginTop: 8 }}>
                {runtimeError && dashboardError ? (
                  <div style={{ color: '#b91c1c' }}>Today Runtime 与 Dashboard 加载失败</div>
                ) : runtime === null && dashboard === null ? (
                  <div style={{ color: '#64748b' }}>加载中…</div>
                ) : progressingItems.length === 0 && activeDashboardMatters.length === 0 ? (
                  <div style={{ color: '#64748b' }}>暂无正在推进事项</div>
                ) : (progressingItems.length > 0 ? progressingItems : activeDashboardMatters).slice(0, 3).map((s, i) => (
                  <div key={`${getMatterId(s) || s.id || i}-progress`} style={{ marginTop: i === 0 ? 8 : 10 }}>
                    <div style={{ fontWeight: 700 }}>{normalizeDisplayText(getMatterTitle(s) || s.matterTitle || s.title)}</div>
                    <div style={{ color: '#64748b', marginTop: 4 }}>{normalizeDisplayText(s.task_title || s.title || s.action || s.stageHint)}</div>
                    <div style={{ color: '#64748b', marginTop: 4 }}>{normalizeDisplayText(s.reason || s.nextAction || s.matterStatus || s.status || '')}</div>
                  </div>
                ))}
              </div>
            </div>

            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #f1f5f9' }} />

            {/* AI 等待律师 */}
            <div>
              <div style={{ fontWeight: 700 }}>AI 等待律师</div>
              <div style={{ marginTop: 8, color: '#64748b' }}>
                {dashboardError ? (
                  <div style={{ color: '#b91c1c' }}>Today Dashboard 加载失败</div>
                ) : dashboard === null ? (
                  <div>加载中…</div>
                ) : waitingItems.length === 0 ? (
                  <div>暂无等待律师事项</div>
                ) : (
                  <ul style={{ marginTop: 6 }}>
                    {waitingItems.slice(0, 3).map((item, idx) => (
                      <li key={`${item.id || item.matterId || idx}-waiting`}>
                        {normalizeDisplayText(item.matterTitle)}：{normalizeDisplayText(item.waitingReason || item.title)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #f1f5f9' }} />

            {/* 今日完成 */}
            <div>
              <div style={{ fontWeight: 700 }}>今日完成</div>
              {dashboardError && runtimeError ? (
                <div style={{ marginTop: 8, color: '#b91c1c' }}>今日完成记录加载失败</div>
              ) : dashboard === null && runtime === null ? (
                <div style={{ marginTop: 8, color: '#64748b' }}>加载中…</div>
              ) : completedItems.length === 0 ? (
                <div style={{ marginTop: 8, color: '#64748b' }}>今天暂无完成记录</div>
              ) : (
                <ul style={{ marginTop: 8 }}>
                  {completedItems.slice(0, 4).map((item, idx) => (
                    <li key={`${item.id || getMatterId(item) || idx}-completed`}>
                      {normalizeDisplayText(item.title || item.action || item.task_title)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
