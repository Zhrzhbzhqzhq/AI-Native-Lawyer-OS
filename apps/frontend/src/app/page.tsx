"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

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

const API = (path = '') => `http://localhost:4000${path}`

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

function isDemoMatterId(matterId: string): boolean {
  return (
    matterId === 'demo-001'
    || matterId === 'e2e-demo-001'
    || matterId.startsWith('demo-')
    || matterId.startsWith('e2e-demo-')
    || matterId.startsWith('mock-')
    || matterId.startsWith('sample-')
  )
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
        const response = await fetch(API('/today/dashboard'), { cache: 'no-store' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const json = await response.json()
        if (!active) return

        const filtered: TodayDashboardResponse = {
          ...json,
          completed: Array.isArray(json.completed) ? json.completed.filter((item: TodayCompletedItem) => !isDemoMatterId(item.matterId)) : [],
          waiting: Array.isArray(json.waiting) ? json.waiting.filter((item: TodayWaitingItem) => !isDemoMatterId(item.matterId)) : [],
          nextActions: Array.isArray(json.nextActions) ? json.nextActions.filter((item: TodayNextActionItem) => !isDemoMatterId(item.matterId)) : [],
          activeMatters: Array.isArray(json.activeMatters) ? json.activeMatters.filter((item: TodayActiveMatterItem) => !isDemoMatterId(item.matterId)) : [],
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

  const openMatter = (matterId: string) => {
    router.push(`/matters/${encodeURIComponent(matterId)}`)
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
        const res = await fetch(API('/today/runtime'), { cache: 'no-store' })
        if (!res.ok) throw new Error('bad')
        const json = await res.json()
        if (!active) return
        setRuntime({
          review: Array.isArray(json.review) ? json.review : [],
          ready: Array.isArray(json.ready) ? json.ready : [],
          handle: Array.isArray(json.handle) ? json.handle : [],
          completed: Array.isArray(json.completed) ? json.completed : [],
          risks: Array.isArray(json.risks) ? json.risks : [],
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
        <button
          onClick={() => router.push('/matters')}
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', padding: '8px 12px', cursor: 'pointer' }}
        >
          查看全部案件
        </button>
      </div>

      {/* Today Runtime from ChiefService */}
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
                    <div style={{ fontWeight: 600 }}>{it.title || it.task_title || '未命名'}</div>
                    <div style={{ marginTop: 4, color: '#475569' }}>{it.matter?.title || it.matterTitle || it.matter?.matter_title || it.matter?.matterTitle || it.matter?.title || it.matter?.matter_id || it.matter_id || ''}</div>
                    <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>
                      下一步：{it.nextAction || '-'} · 原因：{it.reason || '-'} · 优先级：{it.priority || '-'}
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
                <div style={{ fontWeight: 600 }}>{item.title || '未命名条目'}</div>
                <div style={{ marginTop: 4, color: '#475569' }}>案件：{item.matterTitle}</div>
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
            {!loading && data.waiting.length === 0 ? <EmptyState text="当前没有待律师处理的阻塞项。" /> : null}
            {!loading && data.waiting.map((item) => (
              <div key={`${item.type}-${item.id}`} style={{ borderTop: '1px solid #f1f5f9', padding: '10px 0' }}>
                <div style={{ fontWeight: 600 }}>{item.title || '未命名条目'}</div>
                <div style={{ marginTop: 4, color: '#475569' }}>{item.waitingReason}</div>
                <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>案件：{item.matterTitle}</div>
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

        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>AI 下一步建议 / Next Actions</h2>
          <div style={{ marginTop: 10 }}>
            {loading ? <EmptyState text="正在加载下一步建议..." /> : null}
            {!loading && data.nextActions.length === 0 ? <EmptyState text="当前没有新的下一步建议。" /> : null}
            {!loading && data.nextActions.map((item) => (
              <div key={item.id} style={{ borderTop: '1px solid #f1f5f9', padding: '10px 0' }}>
                <div style={{ fontWeight: 600 }}>{item.action}</div>
                <div style={{ marginTop: 4, color: '#475569' }}>{item.reason}</div>
                <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>预计耗时：{item.etaMinutes} 分钟</div>
                <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>案件：{item.matterTitle}</div>
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
                <div style={{ fontWeight: 600 }}>{item.matterTitle}</div>
                <div style={{ marginTop: 4, color: '#475569' }}>阶段：{item.stageHint}</div>
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
    </main>
  )
}
