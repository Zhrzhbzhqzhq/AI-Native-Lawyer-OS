"use client"
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiUrl } from '../lib/api'

type TodayCompletedItem = {
  id: string
  type: 'task' | 'evidence' | 'fact' | 'issue' | 'law' | 'argument' | 'document' | 'ai_record'
  matterId: string
  matterTitle: string
  title: string
  completedAt: string
  sourceStatus: string
}

type TodayWaitingItem = {
  id: string
  type: 'task' | 'document' | 'evidence' | 'issue' | 'argument' | 'ai_record'
  matterId: string
  matterTitle: string
  title: string
  waitingReason: string
  sourceStatus: string
  updatedAt: string
  waitingType?: 'approval' | 'confirmation' | 'supplement' | 'decision' | 'other'
  priority?: number
  needsLawyerAction?: boolean
}

type TodayNextActionItem = {
  id: string
  matterId: string
  matterTitle: string
  action: string
  reason: string
  priority: 'P1' | 'P2' | 'P3'
  etaMinutes: number
  source: 'rule_engine_v1'
}

type TodayActiveMatterItem = {
  matterId: string
  matterTitle: string
  matterStatus: string
  priority: 'P1' | 'P2' | 'P3'
  stageHint: string
  waitingCount: number
  nextActionCount: number
  updatedAt: string
}

type TodayDashboardResponse = {
  generatedAt: string
  summary: {
    completedCount: number
    waitingCount: number
    nextActionsCount: number
    activeMattersCount: number
  }
  completed: TodayCompletedItem[]
  waiting: TodayWaitingItem[]
  nextActions: TodayNextActionItem[]
  activeMatters: TodayActiveMatterItem[]
  meta: {
    dataVersion: 'v1'
    partial: boolean
    warnings: string[]
  }
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizeDisplayText(value: unknown): string {
  if (value === null || value === undefined) return '暂无内容'

  const text = String(value).trim()
  if (!text) return '暂无内容'

  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const candidate = parsed.summary || parsed.next_action || parsed.next
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim()
        }

        return 'AI 结果待确认'
      }

      if (Array.isArray(parsed)) return parsed.length > 0 ? 'AI 结果待确认' : '暂无内容'
    } catch (err) {
      return 'AI 结果待确认'
    }
  }

  return text
}

function getRuntimeMatterId(item: any): string {
  return item?.matter?.matter_id || item?.matterId || item?.matter_id || ''
}

function getRuntimeMatterTitle(item: any): string {
  return item?.matter?.title || item?.matterTitle || item?.matter?.matter_title || item?.matter?.matterTitle || ''
}

function normalizeRuntimeItem(item: any): any {
  const matterTitle = getRuntimeMatterTitle(item)
  return {
    ...item,
    title: normalizeDisplayText(item?.title || item?.task_title || '未命名'),
    task_title: normalizeDisplayText(item?.task_title || item?.title || '未命名'),
    action: normalizeDisplayText(item?.action || ''),
    nextAction: normalizeDisplayText(item?.nextAction || '-'),
    reason: normalizeDisplayText(item?.reason || '-'),
    matterTitle: normalizeDisplayText(matterTitle || getRuntimeMatterId(item) || '暂无内容'),
  }
}

function normalizeCompletedItem(item: TodayCompletedItem): TodayCompletedItem {
  return {
    ...item,
    matterTitle: normalizeDisplayText(item.matterTitle),
    title: normalizeDisplayText(item.title),
    sourceStatus: normalizeDisplayText(item.sourceStatus),
  }
}

function normalizeWaitingItem(item: TodayWaitingItem): TodayWaitingItem {
  return {
    ...item,
    matterTitle: normalizeDisplayText(item.matterTitle),
    title: normalizeDisplayText(item.title),
    waitingReason: normalizeDisplayText(item.waitingReason),
    sourceStatus: normalizeDisplayText(item.sourceStatus),
  }
}

function normalizeNextActionItem(item: TodayNextActionItem): TodayNextActionItem {
  return {
    ...item,
    matterTitle: normalizeDisplayText(item.matterTitle),
    action: normalizeDisplayText(item.action),
    reason: normalizeDisplayText(item.reason),
  }
}

function normalizeActiveMatterItem(item: TodayActiveMatterItem): TodayActiveMatterItem {
  return {
    ...item,
    matterTitle: normalizeDisplayText(item.matterTitle),
    stageHint: normalizeDisplayText(item.stageHint),
  }
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ color: '#64748b', padding: '6px 0' }}>
      {text}
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<TodayDashboardResponse>({
    generatedAt: '',
    summary: {
      completedCount: 0,
      waitingCount: 0,
      nextActionsCount: 0,
      activeMattersCount: 0,
    },
    completed: [],
    waiting: [],
    nextActions: [],
    activeMatters: [],
    meta: {
      dataVersion: 'v1',
      partial: false,
      warnings: [],
    },
  })

  useEffect(() => {
    let active = true
    async function loadDashboard() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(apiUrl('/today/dashboard'), { cache: 'no-store' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const json = await response.json()
        if (!active) return

        const completed = Array.isArray(json.completed)
          ? json.completed.map(normalizeCompletedItem)
          : []
        const waiting = Array.isArray(json.waiting)
          ? json.waiting.map(normalizeWaitingItem)
          : []
        const nextActions = Array.isArray(json.nextActions)
          ? json.nextActions.map(normalizeNextActionItem)
          : []
        const activeMatters = Array.isArray(json.activeMatters)
          ? json.activeMatters.map(normalizeActiveMatterItem)
          : []

        const filtered: TodayDashboardResponse = {
          ...json,
          completed,
          waiting,
          nextActions,
          activeMatters,
        }

        filtered.summary = {
          completedCount: filtered.completed.length,
          waitingCount: filtered.waiting.length,
          nextActionsCount: filtered.nextActions.length,
          activeMattersCount: filtered.activeMatters.length,
        }

        setData(filtered)
      } catch (e: any) {
        if (!active) return
        setError(e?.message || '加载失败')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()
    return () => {
      active = false
    }
  }, [])

  const generatedAtText = useMemo(() => (
    data.generatedAt ? formatTime(data.generatedAt) : '-'
  ), [data.generatedAt])

  const lawyerWaitingItems = useMemo(() => {
    return [...data.waiting]
      .filter((item) => item.needsLawyerAction === true)
      .sort((a, b) => {
        const priorityA = typeof a.priority === 'number' ? a.priority : Number.MAX_SAFE_INTEGER
        const priorityB = typeof b.priority === 'number' ? b.priority : Number.MAX_SAFE_INTEGER
        if (priorityA !== priorityB) return priorityA - priorityB
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
      .slice(0, 5)
  }, [data.waiting])

  const openMatter = (matterId: string) => {
    router.push(`/matters/${encodeURIComponent(matterId)}`)
  }

  function pickTopSuggestion(d: TodayDashboardResponse | null) {
    if (!d) return null
    // Priority 1: Waiting for Lawyer
    if (Array.isArray(d.waiting) && d.waiting.length > 0) {
      const w = d.waiting[0]
      return {
        matterId: w.matterId,
        title: normalizeDisplayText(w.matterTitle || w.title),
        nextStep: normalizeDisplayText(w.title),
        reasons: [normalizeDisplayText(w.waitingReason || w.sourceStatus || ''), `更新于 ${formatTime((w as any).updatedAt || (w as any).updated_at || '')}`].filter(Boolean).slice(0, 3)
      }
    }
    // Priority 2: Next actions (nearest due date not available, pick first)
    if (Array.isArray(d.nextActions) && d.nextActions.length > 0) {
      const n = d.nextActions[0]
      return {
        matterId: n.matterId,
        title: normalizeDisplayText(n.matterTitle || n.action),
        nextStep: normalizeDisplayText(n.action),
        reasons: [normalizeDisplayText(n.reason || ''), `预计 ${n.etaMinutes ?? '-'} 分钟`].filter(Boolean).slice(0, 3)
      }
    }
    // Priority 3: Active matters
    if (Array.isArray(d.activeMatters) && d.activeMatters.length > 0) {
      const a = d.activeMatters[0]
      return {
        matterId: a.matterId,
        title: normalizeDisplayText(a.matterTitle),
        nextStep: normalizeDisplayText(a.stageHint || '查看案件'),
        reasons: [normalizeDisplayText(a.stageHint || ''), `等待项 ${a.waitingCount}`].filter(Boolean).slice(0, 3)
      }
    }
    // Priority 4: fallback recent update
    return null
  }

  const [runtimeLoading, setRuntimeLoading] = useState(true)
  const [runtimeError, setRuntimeError] = useState(false)
  const [runtime, setRuntime] = useState<{ review: any[]; ready: any[]; handle: any[]; completed: any[]; risks: any[] }>({ review: [], ready: [], handle: [], completed: [], risks: [] })

  useEffect(() => {
    let active = true
    async function loadRuntime() {
      setRuntimeLoading(true)
      setRuntimeError(false)
      try {
        const res = await fetch(apiUrl('/today/runtime'), { cache: 'no-store' })
        if (!res.ok) throw new Error('bad')
        const json = await res.json()
        if (!active) return
        setRuntime({
          review: Array.isArray(json.review) ? json.review.map(normalizeRuntimeItem) : [],
          ready: Array.isArray(json.ready) ? json.ready.map(normalizeRuntimeItem) : [],
          handle: Array.isArray(json.handle) ? json.handle.map(normalizeRuntimeItem) : [],
          completed: Array.isArray(json.completed) ? json.completed.map(normalizeRuntimeItem) : [],
          risks: Array.isArray(json.risks) ? json.risks.map(normalizeRuntimeItem) : [],
        })
      } catch (e) {
        if (!active) return
        setRuntimeError(true)
      } finally {
        if (active) setRuntimeLoading(false)
      }
    }

    loadRuntime()
    return () => { active = false }
  }, [])

  return (
    <main style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>今日工作台</h1>
          <div style={{ marginTop: 6, color: '#64748b' }}>Today Dashboard</div>
        </div>
        <Link
          href="/matters"
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', padding: '8px 12px', cursor: 'pointer', color: '#111827', textDecoration: 'none', display: 'inline-block' }}
        >
          查看全部案件
        </Link>
      </div>

      {/* Today Runtime from ChiefService */}
      {/* Main Suggestion Card */}
      <div style={{ marginTop: 18 }}>
        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>今日建议</div>
              <div style={{ marginTop: 6, color: '#64748b' }}>AI 推荐当前最优先处理案件</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            {loading ? <EmptyState text="正在加载建议..." /> : null}
            {!loading && (
              (() => {
                const s = pickTopSuggestion(data)
                if (!s) return <EmptyState text="暂无建议" />
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{normalizeDisplayText(s.title)}</div>
                      <div style={{ marginTop: 8, color: '#475569' }}>
                        {s.reasons && s.reasons.map((r, i) => (<div key={i} style={{ marginTop: i === 0 ? 0 : 6 }}>• {normalizeDisplayText(r)}</div>))}
                      </div>
                      <div style={{ marginTop: 8, color: '#64748b' }}>下一步：{normalizeDisplayText(s.nextStep || '-')}</div>
                    </div>
                    <div>
                      <button
                        onClick={() => openMatter(s.matterId)}
                        style={{ border: 'none', borderRadius: 8, background: '#0ea5a4', color: '#fff', padding: '10px 14px', cursor: 'pointer' }}
                      >
                        开始今天工作
                      </button>
                    </div>
                  </div>
                )
              })()
            )}
          </div>
        </section>
      </div>
      <div style={{ marginTop: 18 }}>
        <h2 style={{ margin: 0 }}>今日待办 / Today Runtime</h2>
        <div style={{ marginTop: 8, color: '#64748b' }}>Review · Ready · Handle · Completed · Risks</div>

        {runtimeError ? (
          <div style={{ marginTop: 12, padding: 12, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
            今日工作暂时无法加载
          </div>
        ) : null}

        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 }}>
          {/** Render five blocks: Review, Ready, Handle, Completed, Risks **/}
          {[
            { key: 'review', title: '等待审核 / Review', items: runtime.review },
            { key: 'ready', title: '建议开始 / Ready', items: runtime.ready },
            { key: 'handle', title: '需要处理 / Handle', items: runtime.handle },
            { key: 'completed', title: '今日完成 / Completed', items: runtime.completed },
            { key: 'risks', title: '风险 / Risks', items: runtime.risks },
          ].map((col) => (
            <section key={col.key} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, minHeight: 80 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{col.title}</div>
              <div style={{ marginTop: 8 }}>
                {runtimeLoading ? <EmptyState text="正在加载..." /> : null}
                {!runtimeLoading && col.items.length === 0 ? <EmptyState text="暂无数据" /> : null}
                {!runtimeLoading && col.items.map((it: any, idx: number) => (
                  <div key={`${col.key}-${idx}`} style={{ borderTop: '1px solid #f1f5f9', padding: '8px 0' }}>
                    <div style={{ fontWeight: 600 }}>{normalizeDisplayText(it.title || it.task_title || '未命名')}</div>
                    <div style={{ marginTop: 4, color: '#475569' }}>{normalizeDisplayText(it.matterTitle || getRuntimeMatterTitle(it) || getRuntimeMatterId(it))}</div>
                    <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>
                      下一步：{normalizeDisplayText(it.nextAction || '-')} · 原因：{normalizeDisplayText(it.reason || '-')} · 优先级：{normalizeDisplayText(it.priority || '-')}
                    </div>
                    <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>更新时间：{formatTime(it.updatedAt || it.updated_at || it.updatedAt || it.updated_at || it.updated_at)}</div>
                    <button
                      onClick={() => openMatter(it.matter?.matter_id || it.matterId || it.matter_id)}
                      style={{ marginTop: 8, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', padding: '6px 10px', cursor: 'pointer' }}
                    >
                      打开案件
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, color: '#64748b' }}>
        最后更新：{generatedAtText}
      </div>

      {error ? (
        <div style={{ marginTop: 12, padding: 12, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
          今日数据暂时不可用，请稍后刷新。
        </div>
      ) : null}

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
          <div style={{ color: '#64748b' }}>今日完成总数</div>
          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>{data.summary.completedCount}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
          <div style={{ color: '#64748b' }}>等待处理总数</div>
          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>{data.summary.waitingCount}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
          <div style={{ color: '#64748b' }}>下一步建议总数</div>
          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>{data.summary.nextActionsCount}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
          <div style={{ color: '#64748b' }}>进行中案件总数</div>
          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>{data.summary.activeMattersCount}</div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>AI 今天完成 / Completed</h2>
          <div style={{ marginTop: 10 }}>
            {loading ? <EmptyState text="正在加载今日完成项..." /> : null}
            {!loading && data.completed.length === 0 ? <EmptyState text="今天还没有完成记录。" /> : null}
            {!loading && data.completed.map((item) => (
              <div key={`${item.type}-${item.id}`} style={{ borderTop: '1px solid #f1f5f9', padding: '10px 0' }}>
                <div style={{ fontWeight: 600 }}>{normalizeDisplayText(item.title || '未命名条目')}</div>
                <div style={{ marginTop: 4, color: '#475569' }}>案件：{normalizeDisplayText(item.matterTitle)}</div>
                <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>完成时间：{formatTime(item.completedAt)}</div>
                <button
                  onClick={() => openMatter(item.matterId)}
                  style={{ marginTop: 8, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', padding: '6px 10px', cursor: 'pointer' }}
                >
                  打开案件
                </button>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>等待律师 / Waiting</h2>
          <div style={{ marginTop: 10 }}>
            {loading ? <EmptyState text="正在加载等待项..." /> : null}
            {!loading && lawyerWaitingItems.length === 0 ? <EmptyState text="当前没有待律师处理的阻塞项。" /> : null}
            {!loading && lawyerWaitingItems.map((item) => (
              <div key={`${item.type}-${item.id}`} style={{ borderTop: '1px solid #f1f5f9', padding: '10px 0' }}>
                <div style={{ fontWeight: 600 }}>{normalizeDisplayText(item.title || '未命名条目')}</div>
                <div style={{ marginTop: 4, color: '#475569' }}>{normalizeDisplayText(item.waitingReason)}</div>
                <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>案件：{normalizeDisplayText(item.matterTitle)}</div>
                <button
                  onClick={() => openMatter(item.matterId)}
                  style={{ marginTop: 8, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', padding: '6px 10px', cursor: 'pointer' }}
                >
                  进入案件
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* AI Working summary block is rendered below the main grids */}
        <div style={{ gridColumn: '1 / -1' }}>
          <section style={{ marginTop: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>AI 正在工作</h2>
            <div style={{ marginTop: 8 }}>
              {runtimeLoading ? <EmptyState text="正在加载 AI 工作..." /> : null}
              {!runtimeLoading && (runtime.handle.length + runtime.review.length) === 0 ? <EmptyState text="暂无 AI 工作。" /> : null}
              {!runtimeLoading && (runtime.handle.length + runtime.review.length) > 0 ? (
                <div>
                  {runtime.handle.map((it: any, idx: number) => (
                    <div key={`ai-h-${idx}`} style={{ borderTop: idx === 0 ? 'none' : '1px solid #f1f5f9', padding: '8px 0' }}>
                      <div style={{ fontWeight: 600 }}>AI 正在：{normalizeDisplayText(it.task_title || it.title || it.action || '处理任务')}</div>
                      <div style={{ marginTop: 4, color: '#475569' }}>{normalizeDisplayText(it.matterTitle || getRuntimeMatterTitle(it) || getRuntimeMatterId(it))}</div>
                    </div>
                  ))}
                  {runtime.review.map((it: any, idx: number) => (
                    <div key={`ai-r-${idx}`} style={{ borderTop: '1px solid #f1f5f9', padding: '8px 0' }}>
                      <div style={{ fontWeight: 600 }}>AI 审核：{normalizeDisplayText(it.task_title || it.title || it.action || '审核中')}</div>
                      <div style={{ marginTop: 4, color: '#475569' }}>{normalizeDisplayText(it.matterTitle || getRuntimeMatterTitle(it) || getRuntimeMatterId(it))}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>AI 下一步建议 / Next Actions</h2>
          <div style={{ marginTop: 10 }}>
            {loading ? <EmptyState text="正在加载下一步建议..." /> : null}
            {!loading && data.nextActions.length === 0 ? <EmptyState text="当前没有新的下一步建议。" /> : null}
            {!loading && data.nextActions.map((item) => (
              <div key={item.id} style={{ borderTop: '1px solid #f1f5f9', padding: '10px 0' }}>
                <div style={{ fontWeight: 600 }}>{normalizeDisplayText(item.action)}</div>
                <div style={{ marginTop: 4, color: '#475569' }}>{normalizeDisplayText(item.reason)}</div>
                <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>预计耗时：{item.etaMinutes} 分钟</div>
                <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>案件：{normalizeDisplayText(item.matterTitle)}</div>
                <button
                  onClick={() => openMatter(item.matterId)}
                  style={{ marginTop: 8, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', padding: '6px 10px', cursor: 'pointer' }}
                >
                  去处理
                </button>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>进行中的案件 / Active Matters</h2>
          <div style={{ marginTop: 10 }}>
            {loading ? <EmptyState text="正在加载进行中案件..." /> : null}
            {!loading && data.activeMatters.length === 0 ? <EmptyState text="当前没有需要推进的案件。" /> : null}
            {!loading && data.activeMatters.map((item) => (
              <div key={item.matterId} style={{ borderTop: '1px solid #f1f5f9', padding: '10px 0' }}>
                <div style={{ fontWeight: 600 }}>{normalizeDisplayText(item.matterTitle)}</div>
                <div style={{ marginTop: 4, color: '#475569' }}>阶段：{normalizeDisplayText(item.stageHint)}</div>
                <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>等待项：{item.waitingCount} · 建议项：{item.nextActionCount}</div>
                <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>更新时间：{formatTime(item.updatedAt)}</div>
                <button
                  onClick={() => openMatter(item.matterId)}
                  style={{ marginTop: 8, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', padding: '6px 10px', cursor: 'pointer' }}
                >
                  查看案件
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
        <Link
          href="/matters"
          style={{ border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', padding: '10px 16px', cursor: 'pointer', color: '#111827', textDecoration: 'none', display: 'inline-block' }}
        >
          进入案件中心
        </Link>
      </div>
    </main>
  )
}
