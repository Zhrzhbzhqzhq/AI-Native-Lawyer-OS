"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const theme = {
  pageBg: '#f8fafc',
  cardBg: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  muted: '#64748b',
  blue: '#2563eb',
}

function TwoLineTitle({ zh, en, size = 'md' }: { zh: string; en?: string; size?: 'xl' | 'md' }) {
  const token = size === 'xl'
    ? { zh: 24, en: 14 }
    : { zh: 16, en: 10 }

  return (
    <div style={{ lineHeight: 1.06 }}>
      <div style={{ fontSize: token.zh, fontWeight: 800, color: theme.text }}>{zh}</div>
      {en ? <div style={{ fontSize: token.en, fontWeight: 400, color: theme.muted, marginTop: 2 }}>{en}</div> : null}
    </div>
  )
}

export default function ExecutionWorkspacePage() {
  const params = useParams() as { matter_id: string }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runtime, setRuntime] = useState<any | null>(null)
  const [executionRows, setExecutionRows] = useState<any[] | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
        const resRuntime = await fetch(`${API}/matters/${params.matter_id}/runtime`).catch(() => null)
        if (resRuntime && resRuntime.ok) {
          try { setRuntime(await resRuntime.json()) } catch (e) { setRuntime(null) }
        }
      } catch (e: any) {
        setError(e?.message || 'Failed')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.matter_id])

  useEffect(() => {
    async function loadExecution() {
      try {
        const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
        const res = await fetch(`${API}/matters/${params.matter_id}/execution`).catch(() => null)
        if (res && res.ok) {
          try { const json = await res.json(); setExecutionRows(Array.isArray(json) ? json : []) } catch (e) { setExecutionRows([]) }
        } else {
          setExecutionRows([])
        }
      } catch (e) {
        setExecutionRows([])
      }
    }
    loadExecution()
  }, [params.matter_id])

  if (loading) return <main style={{ padding: 24 }}><div>正在加载执行工作区...</div></main>
  if (error) return <main style={{ padding: 24 }}><div style={{ color: '#b91c1c' }}>错误：{error}</div></main>

  const runtimeHint = runtime ? 'AI 运行时已连接，当前展示为执行工作台标准视图。' : '当前使用执行工作台标准视图（Mock）。'

  const executionStatus = [
    { label: '当前阶段', value: '执行前准备' },
    { label: '法院状态', value: '尚未立案执行' },
    { label: '执行依据', value: '待确认' },
    { label: '完成度', value: '0%' },
  ]

  // Map backend execution rows to UI shape and provide fallback
  const realExecutionStatus: any[] = Array.isArray(executionRows) ? executionRows.map((r) => ({ label: String(r.action_id || r.queue_id || ''), value: String(r.execution_status || '') })) : []
  const realExecutionStatusOrFallback = realExecutionStatus.length ? realExecutionStatus : executionStatus

  const assetClues = [
    { name: '银行账户', status: '待核查' },
    { name: '车辆信息', status: '待核查' },
    { name: '不动产', status: '待核查' },
    { name: '微信/支付宝流水', status: '待核查' },
    { name: '工商股权', status: '待核查' },
  ]

  const executionMaterials = [
    '执行申请书',
    '生效判决/调解书',
    '送达证明',
    '财产线索清单',
  ]

  // derive execution advice from runtime snapshot when available
  const runtimeData: any = runtime || null
  let realExecutionAdvice = ''
  try {
    if (runtimeData) {
      // prefer runtime_next_step if it's a string or has description/title
      const rns = runtimeData.runtime_next_step
      if (rns) {
        if (typeof rns === 'string') realExecutionAdvice = rns
        else if (typeof rns === 'object') realExecutionAdvice = rns.description || rns.title || JSON.stringify(rns)
      }

      // fallback to runtime_plan summary or ai.last_summary
      if (!realExecutionAdvice) {
        const plan = runtimeData.runtime_plan
        if (plan) realExecutionAdvice = plan.summary || plan.description || JSON.stringify(plan)
      }

      if (!realExecutionAdvice) {
        const ai = runtimeData.ai
        if (ai && ai.last_summary) realExecutionAdvice = ai.last_summary.summary || ai.last_summary.message || JSON.stringify(ai.last_summary)
      }

      // final fallback to snapshot_facts hints
      if (!realExecutionAdvice) {
        const sf = runtimeData.snapshot_facts
        if (sf) {
          realExecutionAdvice = `文书：${sf.documents?.draft ?? 0} 草稿，${sf.documents?.final ?? 0} 已定稿；证据弱项：${sf.evidence?.weak ?? 0} 项。建议补强关键证据与材料。`
        }
      }
    }
  } catch (e) {
    realExecutionAdvice = ''
  }

  const realExecutionAdviceOrFallback = realExecutionAdvice || '下一步建议律师补强执行依据、确认被执行人财产线索、准备执行申请材料。'

  // derive asset clues from runtime snapshot and related runtime fields
  let realAssetClues: Array<{ name: string; status: string }> = []
  try {
    if (runtime) {
      const sf = runtime.snapshot_facts
      if (sf) {
        // accounts
        if (sf.accounts && Array.isArray(sf.accounts)) {
          const cnt = sf.accounts.length
          realAssetClues.push({ name: '银行账户', status: cnt ? `发现 ${cnt} 条疑似账户` : '未发现' })
        }

        // vehicles
        if (sf.vehicles && Array.isArray(sf.vehicles)) {
          const cnt = sf.vehicles.length
          realAssetClues.push({ name: '车辆信息', status: cnt ? `发现 ${cnt} 辆相关车辆` : '未发现' })
        }

        // real estate / properties
        if (sf.real_estate && Array.isArray(sf.real_estate)) {
          const cnt = sf.real_estate.length
          realAssetClues.push({ name: '不动产', status: cnt ? `发现 ${cnt} 处不动产` : '未发现' })
        }

        // business / equity
        if (sf.companies && Array.isArray(sf.companies)) {
          const cnt = sf.companies.length
          realAssetClues.push({ name: '工商/股权', status: cnt ? `发现 ${cnt} 条工商线索` : '未发现' })
        }

        // payment flows hints
        if (sf.payment_flows && (Array.isArray(sf.payment_flows) || typeof sf.payment_flows === 'number')) {
          const cnt = Array.isArray(sf.payment_flows) ? sf.payment_flows.length : sf.payment_flows
          realAssetClues.push({ name: '微信/支付宝流水', status: cnt ? `发现 ${cnt} 条流水线索` : '未发现' })
        }

        // generic clues count
        if (sf.clues && Array.isArray(sf.clues)) {
          const cnt = sf.clues.length
          realAssetClues.push({ name: '其他线索', status: cnt ? `共 ${cnt} 条` : '无' })
        }
      }

      // runtime actions / works: look for investigations or asset-related tasks
      const actions = runtime.runtime_actions || runtime.runtime_works || []
      if (actions && Array.isArray(actions)) {
        const assetActions = actions.filter((a: any) => {
          const t = String(a.type || a.action_type || a.name || '').toLowerCase()
          return t.includes('asset') || t.includes('account') || t.includes('property') || t.includes('investig') || t.includes('clue') || t.includes('trace')
        })
        if (assetActions.length) {
          assetActions.forEach((a: any, idx: number) => {
            const label = a.name || a.action_id || a.type || `资产任务 ${idx + 1}`
            const status = a.status || a.state || a.execution_status || '进行中'
            realAssetClues.push({ name: String(label), status: String(status) })
          })
        }
      }

      // runtime_plan may contain planned investigations
      if (runtime.runtime_plan && typeof runtime.runtime_plan === 'object') {
        const rp = runtime.runtime_plan
        if (rp.asset_focus) {
          realAssetClues.push({ name: '计划中的资产调查', status: rp.asset_focus })
        }
        if (rp.next_actions && Array.isArray(rp.next_actions)) {
          rp.next_actions.filter((na: any) => String(na).toLowerCase().includes('account') || String(na).toLowerCase().includes('asset')).slice(0, 3).forEach((na: any, i: number) => {
            realAssetClues.push({ name: `计划动作 ${i + 1}`, status: String(na) })
          })
        }
      }

      // dedupe by name keeping first status
      const seen = new Set<string>()
      realAssetClues = realAssetClues.filter((it) => {
        if (seen.has(it.name)) return false
        seen.add(it.name)
        return true
      })
    }
  } catch (e) {
    realAssetClues = []
  }

  const realAssetCluesOrFallback = realAssetClues.length ? realAssetClues : assetClues

  // derive execution materials from runtime (runtime_works, runtime_actions, snapshot_facts, documents, evidence)
  let realExecutionMaterials: string[] = []
  try {
    if (runtime) {
      const works = Array.isArray(runtime.runtime_works) ? runtime.runtime_works : (Array.isArray(runtime.runtime_actions) ? runtime.runtime_actions : [])

      // Inspect works/actions for material-related hints
      works.forEach((w: any) => {
        const t = String(w.type || w.name || w.action_type || '').toLowerCase()
        const title = w.title || w.name || w.document_name || w.type || w.action_id || ''
        if (t.includes('judg') || String(title).toLowerCase().includes('判决') || String(title).toLowerCase().includes('裁判')) {
          realExecutionMaterials.push('判决书')
        }
        if (t.includes('application') || String(title).toLowerCase().includes('申请')) {
          realExecutionMaterials.push('执行申请书')
        }
        if (t.includes('investig') || t.includes('invest') || String(title).toLowerCase().includes('调查')) {
          realExecutionMaterials.push('财产调查材料')
        }
        if (t.includes('bank') || t.includes('flow') || String(title).toLowerCase().includes('流水')) {
          realExecutionMaterials.push('银行流水')
        }
        if (t.includes('clue') || String(title).toLowerCase().includes('线索')) {
          realExecutionMaterials.push('财产线索')
        }
        if (t.includes('id') || String(title).toLowerCase().includes('身份') || String(title).toLowerCase().includes('身份证')) {
          realExecutionMaterials.push('身份信息')
        }
        if (t.includes('check') || String(title).toLowerCase().includes('查控') || String(title).toLowerCase().includes('查封')) {
          realExecutionMaterials.push('查控申请')
        }
      })

      // snapshot_facts may include documents/evidence counts or named items
      const sf = runtime.snapshot_facts || {}
      if (sf.documents && Array.isArray(sf.documents)) {
        sf.documents.forEach((d: any) => {
          const name = String(d.title || d.name || d.type || '')
          if (name.toLowerCase().includes('判决') || name.toLowerCase().includes('裁判')) realExecutionMaterials.push('判决书')
          if (name.toLowerCase().includes('申请')) realExecutionMaterials.push('执行申请书')
        })
      }
      if (sf.evidence && Array.isArray(sf.evidence)) {
        sf.evidence.forEach((e: any) => {
          const name = String(e.type || e.title || e.name || '')
          if (name.toLowerCase().includes('流水') || name.toLowerCase().includes('银行')) realExecutionMaterials.push('银行流水')
          if (name.toLowerCase().includes('线索') || name.toLowerCase().includes('线索')) realExecutionMaterials.push('财产线索')
        })
      }

      // runtime.documents / runtime.evidence at top-level
      if (Array.isArray(runtime.documents)) {
        runtime.documents.forEach((d: any) => {
          const title = String(d.title || d.name || '')
          if (title.toLowerCase().includes('判决') || title.toLowerCase().includes('裁判')) realExecutionMaterials.push('判决书')
        })
      }
      if (Array.isArray(runtime.evidence)) {
        runtime.evidence.forEach((e: any) => {
          const t = String(e.type || e.title || e.name || '')
          if (t.toLowerCase().includes('流水') || t.toLowerCase().includes('银行')) realExecutionMaterials.push('银行流水')
        })
      }

      // generic hints: if any bank/account clues exist in snapshot_facts
      if ((sf.accounts && sf.accounts.length) || (sf.payment_flows && sf.payment_flows.length)) realExecutionMaterials.push('银行流水')
      if ((sf.real_estate && sf.real_estate.length) || (sf.properties && sf.properties.length)) realExecutionMaterials.push('财产线索')

      // always include basic expected materials if nothing specific found
      // dedupe and keep ordering
      const dedup = Array.from(new Set(realExecutionMaterials))
      realExecutionMaterials = dedup
    }
  } catch (e) {
    realExecutionMaterials = []
  }

  const realExecutionMaterialsOrFallback = realExecutionMaterials.length ? realExecutionMaterials : executionMaterials

  return (
    <main style={{ padding: 24, background: theme.pageBg }}>
      <div style={{ padding: 20, borderRadius: 16, background: theme.cardBg, border: `1px solid ${theme.border}`, boxShadow: '0 8px 24px rgba(2,6,23,0.04)' }}>
        <TwoLineTitle zh="执行工作台" en="Execution Workspace" size="xl" />
        <div style={{ color: theme.muted, marginTop: 10 }}>AI 正在跟踪执行线索、财产状态与法院进展。</div>
        <div style={{ color: theme.muted, marginTop: 8, fontSize: 13 }}>{runtimeHint}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, marginTop: 16 }}>
        <section style={{ background: theme.cardBg, padding: 16, borderRadius: 12, border: `1px solid ${theme.border}` }}>
          <TwoLineTitle zh="执行状态" en="Execution Status" size="md" />
          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
            {realExecutionStatusOrFallback.map((it) => (
              <div key={it.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ color: theme.muted }}>{it.label}</div>
                <div style={{ color: theme.text, fontWeight: 600 }}>{it.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: theme.cardBg, padding: 16, borderRadius: 12, border: `1px solid ${theme.border}` }}>
          <TwoLineTitle zh="财产线索" en="Asset Clues" size="md" />
          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
            {realAssetCluesOrFallback.map((it) => (
              <div key={it.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ color: theme.text, fontWeight: 600 }}>{it.name}</div>
                <div style={{ color: theme.muted }}>{it.status}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: theme.cardBg, padding: 16, borderRadius: 12, border: `1px solid ${theme.border}` }}>
          <TwoLineTitle zh="AI 执行建议" en="AI Execution Advice" size="md" />
          <div style={{ color: theme.text, marginTop: 12, lineHeight: 1.65 }}>
            {realExecutionAdviceOrFallback}
          </div>
          <div style={{ marginTop: 14 }}>
            <a
              href={`/matters/${params.matter_id}/runtime`}
              style={{
                display: 'inline-block',
                padding: '8px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                color: '#ffffff',
                background: theme.blue,
                border: `1px solid ${theme.blue}`,
                fontWeight: 600,
              }}
            >
              查看执行上下文
            </a>
          </div>
        </section>

        <section style={{ background: theme.cardBg, padding: 16, borderRadius: 12, border: `1px solid ${theme.border}` }}>
          <TwoLineTitle zh="执行材料" en="Execution Materials" size="md" />
          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
            {realExecutionMaterialsOrFallback.map((it) => (
              <div key={it} style={{ paddingBottom: 8, borderBottom: `1px solid ${theme.border}`, color: theme.text, fontWeight: 600 }}>
                {it}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div style={{ marginTop: 16, background: theme.cardBg, padding: 14, borderRadius: 12, border: `1px solid ${theme.border}`, color: theme.muted, fontSize: 13 }}>
        执行工作区当前为第一阶段设计样式，数据展示以执行办案流程为核心，不改变既有业务逻辑。
      </div>
    </main>
  )
}
