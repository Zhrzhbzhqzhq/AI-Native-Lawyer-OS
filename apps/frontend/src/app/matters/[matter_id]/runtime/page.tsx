"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const tokens = {
  blue: '#2563eb',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  pageBg: '#f8fafc',
  cardBg: '#ffffff',
  radius: 12,
  shadow: '0 8px 24px rgba(2,6,23,0.04)',
  spacing: 16,
}

export default function RuntimeDashboardPage() {
  const params = useParams() as { matter_id: string }
  const [runtime, setRuntime] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)

  const createMockRuntime = () => ({
    runtime_decision: { code: 'COLLECT_EVIDENCE' },
    runtime_plan: {
      goal: '建立证明体系并推进起诉准备',
      steps: ['分析冲突证据', '补充法律依据', '生成代理词初稿'],
    },
    today_queue: [
      { title: '完成 OCR', status: 'DONE', time: '17:28' },
      { title: '完成证据分类', status: 'DONE', time: '17:31' },
      { title: '建立证明体系', status: 'RUNNING', time: '17:36' },
      { title: '上传借条原件', status: 'WAITING_LAWYER', time: '17:40' },
    ],
    runtime_actions: [
      { title: '完成 OCR', status: 'DONE', time: '17:28' },
      { title: '完成证据分类', status: 'DONE', time: '17:31' },
      { title: '开始建立证明体系', status: 'RUNNING', time: '17:36' },
      { title: '等待律师上传借条', status: 'WAITING_LAWYER', time: '17:40' },
    ],
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      setNotice(null)
      // For demo matter, skip runtime fetch and use empty local state
      if (!params.matter_id) {
        setRuntime(null)
        setLoading(false)
        return
      }
      try {
        const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
        const res = await fetch(`${API}/matters/${params.matter_id}/runtime`).catch(() => null)
        if (!res || !res.ok) {
          // no runtime available — keep runtime null and surface notice
          setRuntime(null)
          setNotice('未检索到 AI Runtime 数据')
        } else {
          const body = await res.json()
          setRuntime(body)
          setNotice(null)
        }
      } catch (e) {
        setRuntime(null)
        setNotice('获取 AI Runtime 失败')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.matter_id])

  const mapDecision = (code?: string) => {
    if (!code) return ''
    switch (String(code || '').toUpperCase()) {
      case 'COLLECT_EVIDENCE':
        return '需要补强证据'
      case 'REVIEW_EVIDENCE':
        return '审查证据'
      case 'LEGAL_RESEARCH':
        return '法律检索'
      case 'RESEARCH_LAW':
        return '补充检索'
      case 'REVIEW_DOCUMENT':
        return '审查文书'
      case 'MONITOR_MATTER':
        return '跟进案件'
      case 'NO_ACTION':
        return '暂无动作'
      default:
        return String(code || '')
    }
  }

  const mapWorkType = (item: any) => {
    const t = String(item?.type || item?.title || item?.work_id || '').toLowerCase()
    if (t.includes('evidence')) return 'Evidence'
    if (t.includes('research') || t.includes('researchwork')) return 'Research'
    if (t.includes('document') || t.includes('doc')) return 'Document'
    return 'Execution'
  }

  const routeForType = (typeLabel: string, matterId: string) => {
    switch (typeLabel) {
      case 'Evidence':
        return `/matters/${matterId}/evidence`
      case 'Research':
        return `/matters/${matterId}/research`
      case 'Document':
        return `/matters/${matterId}/documents`
      case 'Execution':
        return `/matters/${matterId}/execution`
      default:
        return `/matters/${matterId}`
    }
  }

  if (loading) return <main style={{ padding: 24 }}><div>正在整理 AI 办案状态…</div></main>

  const decision = runtime?.runtime_decision || runtime?.runtimeDecision || null
  const today = runtime?.today_queue || runtime?.todayQueue || []
  const plan = runtime?.runtime_plan || runtime?.runtimePlan || null
  const actions = runtime?.runtime_actions || runtime?.runtimeActions || []

  const getTimeText = (item: any) => {
    const raw = item?.time || item?.timestamp || item?.created_at || item?.updated_at || item?.completed_at
    if (!raw) return '--:--'
    const text = String(raw)
    if (/^\d{2}:\d{2}/.test(text)) return text.slice(0, 5)
    const matched = text.match(/(\d{2}:\d{2})/)
    if (matched?.[1]) return matched[1]
    return '--:--'
  }

  const normalizeTitle = (item: any) => {
    const raw = String(item?.title || item?.name || item?.operation || item?.type || item?.action || '')
    const value = raw.toLowerCase()
    if (!raw) return '处理案件工作'
    if (value.includes('ocr')) return '完成 OCR'
    if (value.includes('classif') || value.includes('evidence')) return '完成证据分类'
    if (value.includes('research')) return '完成法律检索'
    if (value.includes('proof') || value.includes('chain')) return '建立证明体系'
    if (value.includes('complaint') || value.includes('document') || value.includes('doc')) return '生成起诉状'
    return raw
  }

  const waitingHintsByDecision = (code?: string) => {
    const key = String(code || '').toUpperCase()
    switch (key) {
      case 'COLLECT_EVIDENCE':
        return ['上传借条原件', '补充转账凭证']
      case 'REVIEW_DOCUMENT':
        return ['确认诉讼请求', '确认赔偿金额']
      case 'LEGAL_RESEARCH':
      case 'RESEARCH_LAW':
        return ['确认检索方向', '确认争议焦点']
      default:
        return ['确认下一步办案目标']
    }
  }

  const doneStatuses = ['DONE', 'COMPLETED']
  const waitingStatuses = ['WAITING', 'WAITING_LAWYER', 'NEEDS_LAWYER', 'BLOCKED']
  const runningStatuses = ['RUNNING', 'IN_PROGRESS']

  const currentActivity = (() => {
    const runningFromToday = (Array.isArray(today) ? today : [])
      .filter((item: any) => runningStatuses.includes(String(item?.status || item?.execution_status || item?.state || '').toUpperCase()))
      .map((item: any) => normalizeTitle(item))
    const fromPlan = Array.isArray(plan?.steps) ? plan.steps.slice(0, 2).map((step: any) => String(step)) : []
    const head = mapDecision(decision?.code) || '推进案件办理'
    return [head, ...runningFromToday, ...fromPlan].filter(Boolean).slice(0, 3)
  })()

  // derive current activity from runtime_decision, runtime_next_step, runtime_plan
  let realCurrentActivity: string[] = []
  try {
    if (runtime) {
      const rd = runtime.runtime_decision || runtime.runtimeDecision || null
      const rn = runtime.runtime_next_step || runtime.runtimeNextStep || null
      const rp = runtime.runtime_plan || runtime.runtimePlan || null

      const head = rd ? mapDecision(rd.code || rd?.action || rd?.code) : ''

      let nextStepText = ''
      if (rn) {
        if (typeof rn === 'string') nextStepText = rn
        else if (typeof rn === 'object') nextStepText = rn.description || rn.title || JSON.stringify(rn)
      }

      const planSteps: string[] = Array.isArray(rp?.steps) ? rp.steps.slice(0, 2).map((s: any) => String(s)) : []

      // build activity list: decision label, runtime next step, then plan steps
      realCurrentActivity = [head, nextStepText, ...planSteps].filter(Boolean).slice(0, 3)
    }
  } catch (e) {
    realCurrentActivity = []
  }

  const realCurrentActivityOrFallback = realCurrentActivity.length ? realCurrentActivity : currentActivity

  const todaysProgress = (() => {
    const doneFromToday = (Array.isArray(today) ? today : [])
      .filter((item: any) => doneStatuses.includes(String(item?.status || item?.execution_status || item?.state || '').toUpperCase()))
      .map((item: any) => ({ title: normalizeTitle(item), time: getTimeText(item) }))
    const doneFromActions = (Array.isArray(actions) ? actions : [])
      .filter((item: any) => doneStatuses.includes(String(item?.status || item?.execution_status || item?.state || '').toUpperCase()))
      .map((item: any) => ({ title: normalizeTitle(item), time: getTimeText(item) }))
    return [...doneFromToday, ...doneFromActions].slice(0, 6)
  })()

  // derive today's progress from runtime.today_queue and runtime_actions (DONE items)
  let realTodaysProgress: Array<{ title: string; time: string }> = []
  try {
    if (runtime) {
      const rawToday = Array.isArray(runtime.today_queue) ? runtime.today_queue : []
      const rawActions = Array.isArray(runtime.runtime_actions) ? runtime.runtime_actions : []
      const doneFromToday = rawToday
        .filter((item: any) => doneStatuses.includes(String(item?.status || item?.execution_status || item?.state || '').toUpperCase()))
        .map((item: any) => ({ title: normalizeTitle(item), time: getTimeText(item) }))
      const doneFromActions = rawActions
        .filter((item: any) => doneStatuses.includes(String(item?.status || item?.execution_status || item?.state || '').toUpperCase()))
        .map((item: any) => ({ title: normalizeTitle(item), time: getTimeText(item) }))
      realTodaysProgress = [...doneFromToday, ...doneFromActions].slice(0, 6)
    }
  } catch (e) {
    realTodaysProgress = []
  }

  const realTodaysProgressOrFallback = realTodaysProgress.length ? realTodaysProgress : todaysProgress

  const nextActions = (() => {
    const steps = Array.isArray(plan?.steps) ? plan.steps.map((step: any) => String(step)) : []
    const stage = runtime?.next_stage || runtime?.workflow?.next_step
    const list = [...steps]
    if (stage) list.push(String(stage))
    if (list.length === 0) list.push('分析冲突证据', '生成代理词', '补充法律依据')
    return list.slice(0, 4)
  })()

  // derive next actions from runtime_next_step, runtime_plan.steps, runtime_actions
  let realNextActions: string[] = []
  try {
    if (runtime) {
      const rn = runtime.runtime_next_step || runtime.runtimeNextStep || null
      if (rn) {
        if (typeof rn === 'string') realNextActions.push(rn)
        else if (typeof rn === 'object') realNextActions.push(rn.description || rn.title || JSON.stringify(rn))
      }

      const rpSteps = Array.isArray(runtime.runtime_plan?.steps) ? runtime.runtime_plan.steps.map((s: any) => String(s)) : (Array.isArray(runtime.runtimePlan?.steps) ? runtime.runtimePlan.steps.map((s: any) => String(s)) : [])
      realNextActions = [...realNextActions, ...rpSteps]

      if (Array.isArray(runtime.runtime_actions)) {
        const pending = runtime.runtime_actions
          .filter((a: any) => !doneStatuses.includes(String(a?.status || a?.execution_status || a?.state || '').toUpperCase()))
          .map((a: any) => normalizeTitle(a))
        realNextActions = [...realNextActions, ...pending]
      }

      // dedupe and limit
      realNextActions = Array.from(new Set(realNextActions)).filter(Boolean).slice(0, 4)
    }
  } catch (e) {
    realNextActions = []
  }

  const realNextActionsOrFallback = realNextActions.length ? realNextActions : nextActions



  const waitingForLawyer = (() => {
    const fromToday = (Array.isArray(today) ? today : [])
      .filter((item: any) => waitingStatuses.includes(String(item?.status || item?.execution_status || item?.state || '').toUpperCase()))
      .map((item: any) => normalizeTitle(item))
    return Array.from(new Set([...fromToday, ...waitingHintsByDecision(decision?.code)])).slice(0, 4)
  })()

  // derive waiting-for-lawyer items from runtime (decision, next_step, assignments, actions)
  let realWaitingForLawyer: string[] = []
  try {
    if (runtime) {
      const rdCode = runtime.runtime_decision?.code || runtime.runtimeDecision?.code || ''
      const hints = waitingHintsByDecision(rdCode)

      const actionsArr = Array.isArray(runtime.runtime_actions) ? runtime.runtime_actions : []
      const waitingFromActions = actionsArr
        .filter((a: any) => waitingStatuses.includes(String(a?.status || a?.execution_status || a?.state || '').toUpperCase()) || String(a?.status || '').toLowerCase().includes('waiting_lawyer'))
        .map((a: any) => normalizeTitle(a))

      const assignments = Array.isArray(runtime.runtime_assignments) ? runtime.runtime_assignments : []
      const waitingFromAssignments = assignments
        .filter((as: any) => {
          const txt = String(as?.task || as?.note || as?.title || as?.instruction || as?.role || '').toLowerCase()
          return txt.includes('lawyer') || txt.includes('confirm') || txt.includes('approve') || txt.includes('authorize') || txt.includes('signature') || txt.includes('确认') || txt.includes('上传') || txt.includes('选择')
        })
        .map((as: any) => String(as?.title || as?.task || as?.instruction || as?.name || normalizeTitle(as)))

      // include waiting hints from decision mapping
      realWaitingForLawyer = Array.from(new Set([...(waitingFromActions || []), ...(waitingFromAssignments || []), ...(hints || [])])).filter(Boolean).slice(0, 6)
    }
  } catch (e) {
    realWaitingForLawyer = []
  }

  const realWaitingForLawyerOrFallback = realWaitingForLawyer.length ? realWaitingForLawyer : waitingForLawyer

  const recentActivity = (() => {
    const fromActions = (Array.isArray(actions) ? actions : []).map((item: any) => ({
      time: getTimeText(item),
      title: normalizeTitle(item),
    }))
    const fallback = [
      ...todaysProgress.map((item: any) => ({ time: item.time, title: item.title })),
      ...currentActivity.map((title: string) => ({ time: '--:--', title: `开始${title}` })),
      ...waitingForLawyer.map((title: string) => ({ time: '--:--', title: `等待律师${title}` })),
    ]
    return (fromActions.length > 0 ? fromActions : fallback).slice(0, 8)
  })()

  // derive recent activity from runtime in priority: logs, events, timeline, runtime_actions, today_queue
  let realRecentActivity: Array<{ time: string; title: string }> = []
  try {
    if (runtime) {
      const logs = Array.isArray(runtime.logs) ? runtime.logs : (Array.isArray(runtime.log) ? runtime.log : [])
      const events = Array.isArray(runtime.events) ? runtime.events : []
      const timeline = Array.isArray(runtime.timeline) ? runtime.timeline : []
      const rActions = Array.isArray(runtime.runtime_actions) ? runtime.runtime_actions : []
      const rToday = Array.isArray(runtime.today_queue) ? runtime.today_queue : []

      const mapItem = (it: any) => ({ time: getTimeText(it), title: normalizeTitle(it) })

      if (logs.length) {
        realRecentActivity = logs.map(mapItem).slice(0, 8)
      } else if (events.length) {
        realRecentActivity = events.map(mapItem).slice(0, 8)
      } else if (timeline.length) {
        realRecentActivity = timeline.map(mapItem).slice(0, 8)
      } else if (rActions.length) {
        realRecentActivity = rActions.map(mapItem).slice(0, 8)
      } else if (rToday.length) {
        realRecentActivity = rToday.map(mapItem).slice(0, 8)
      } else {
        realRecentActivity = []
      }
    }
  } catch (e) {
    realRecentActivity = []
  }

  const realRecentActivityOrFallback = realRecentActivity.length ? realRecentActivity : recentActivity

  const firstToday = Array.isArray(today) && today.length > 0 ? today[0] : null
  const firstType = firstToday ? mapWorkType(firstToday) : null
  const firstRoute = firstType ? routeForType(firstType, params.matter_id) : `/matters/${params.matter_id}`

  const SectionTitle = ({ zh, en }: { zh: string; en: string }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: tokens.text }}>{zh}</div>
      <div style={{ marginTop: 2, fontSize: 12, color: tokens.muted }}>{en}</div>
    </div>
  )

  return (
    <main style={{ padding: 32, background: tokens.pageBg, color: tokens.text }}>
      <div>
        <div style={{ fontSize: 24, fontWeight: 900, color: tokens.text }}>AI 工作中心</div>
        <div style={{ marginTop: 4, fontSize: 12, color: tokens.muted }}>AI Runtime</div>
      </div>

      {notice ? (
        <div style={{ marginTop: 10, color: tokens.muted, fontSize: 12 }}>{notice}</div>
      ) : null}

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <section style={{ background: tokens.cardBg, padding: tokens.spacing, borderRadius: tokens.radius, border: `1px solid ${tokens.border}`, boxShadow: tokens.shadow }}>
          <SectionTitle zh="AI 当前工作" en="Current Activity" />
          {realCurrentActivityOrFallback.length > 0 ? realCurrentActivityOrFallback.map((item: string, index: number) => (
            <div key={`${item}-${index}`} style={{ marginBottom: 8, color: tokens.text }}>• {item}</div>
          )) : <div style={{ color: tokens.muted }}>暂无进行中的工作。</div>}
          <div style={{ marginTop: 10 }}>
            <a href={firstRoute} style={{ textDecoration: 'none' }}>
              <button style={{ background: tokens.blue, color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>进入当前工作</button>
            </a>
          </div>
        </section>

        <section style={{ background: tokens.cardBg, padding: tokens.spacing, borderRadius: tokens.radius, border: `1px solid ${tokens.border}`, boxShadow: tokens.shadow }}>
          <SectionTitle zh="今日完成" en="Today's Progress" />
          {realTodaysProgressOrFallback.length > 0 ? realTodaysProgressOrFallback.map((item: any, index: number) => (
            <div key={`${item.title}-${index}`} style={{ marginBottom: 8, color: tokens.text }}>
              <span style={{ color: tokens.muted, marginRight: 8 }}>{item.time}</span>
              <span>{item.title}</span>
            </div>
          )) : <div style={{ color: tokens.muted }}>今天暂无已完成事项。</div>}
        </section>

        <section style={{ background: tokens.cardBg, padding: tokens.spacing, borderRadius: tokens.radius, border: `1px solid ${tokens.border}`, boxShadow: tokens.shadow }}>
          <SectionTitle zh="下一步计划" en="Next Actions" />
          {realNextActionsOrFallback.length > 0 ? realNextActionsOrFallback.map((item: string, index: number) => (
            <div key={`${item}-${index}`} style={{ marginBottom: 8, color: tokens.text }}>• {item}</div>
          )) : <div style={{ color: tokens.muted }}>暂无下一步计划。</div>}
        </section>

        <section style={{ background: tokens.cardBg, padding: tokens.spacing, borderRadius: tokens.radius, border: `1px solid ${tokens.border}`, boxShadow: tokens.shadow }}>
          <SectionTitle zh="等待律师" en="Waiting for Lawyer" />
          {realWaitingForLawyerOrFallback.length > 0 ? realWaitingForLawyerOrFallback.map((item: string, index: number) => (
            <div key={`${item}-${index}`} style={{ marginBottom: 8, color: tokens.text }}>• {item}</div>
          )) : <div style={{ color: tokens.muted }}>当前无需律师补充动作。</div>}
        </section>
      </div>

      <section style={{ marginTop: 14, background: tokens.cardBg, padding: tokens.spacing, borderRadius: tokens.radius, border: `1px solid ${tokens.border}`, boxShadow: tokens.shadow }}>
        <SectionTitle zh="最近工作记录" en="Recent Activity" />
        <div style={{ display: 'grid', gap: 8 }}>
          {realRecentActivityOrFallback.length > 0 ? realRecentActivityOrFallback.map((item: any, index: number) => (
            <div key={`${item.time}-${item.title}-${index}`} style={{ color: tokens.text }}>
              <span style={{ color: tokens.muted, marginRight: 10 }}>{item.time}</span>
              <span>{item.title}</span>
            </div>
          )) : <div style={{ color: tokens.muted }}>暂无最近工作记录。</div>}
        </div>
      </section>
    </main>
  )
}
