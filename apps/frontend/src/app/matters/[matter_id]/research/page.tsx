"use client"
import React, { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Theme (file scope so all helpers can use it)
const lawdesk = {
  pageBg: '#f4f7fb',
  cardBg: '#ffffff',
  border: '#e6eef6',
  text: '#0f172a',
  muted: '#64748b',
  blue: '#2563eb',
  radius: 8,
}

type CaseItem = {
  id: string
  court: string
  case_no: string
  support: string
  credibility: string
}

type LawItem = {
  id: string
  title: string
  excerpt: string
  applicability: string
}

type NextAction = {
  id: string
  title: string
  successRate: number
  eta: string
}

export default function ResearchWorkspacePage() {

  // Runtime state
  const [aiRunning, setAiRunning] = useState(false)
  const [aiStage, setAiStage] = useState('AI 已准备就绪')
  const [aiTask, setAiTask] = useState('等待律师上传材料')
  const [aiProgress, setAiProgress] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'phase1' | 'awaiting_human' | 'phase2' | 'done'>('idle')

  // Upload area
  const [textInput, setTextInput] = useState('')
  const [files, setFiles] = useState<File[]>([])

  // Live outputs
  const [logs, setLogs] = useState<string[]>(['AI 等待开始……'])
  const [copilotText, setCopilotText] = useState('我会先理解案件，再制定检索策略。')
  // append M63 note
  useEffect(() => {
    setCopilotText((t) => t + '\n\n我已为你生成推荐检索词和优先检索网站。部分网站可能需要登录、验证码或人工筛选，建议律师手动检索后，将结果粘贴或上传给我继续分析。')
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [legalOpinion, setLegalOpinion] = useState<string | null>(null)
  const [cases, setCases] = useState<CaseItem[]>([])
  const [laws, setLaws] = useState<LawItem[]>([])
  const [nextActions, setNextActions] = useState<NextAction[]>([])
  const [aiCompleted, setAiCompleted] = useState(false)

  // M63: recommended keywords and sites (static suggestions for UI)
  const recommendedKeywords = [
    { id: 'k1', stars: 5, term: '借款事实认定', purpose: '用于确认借款关系是否成立' },
    { id: 'k2', stars: 5, term: '微信聊天记录 借款', purpose: '用于检索聊天记录证明借款合意' },
    { id: 'k3', stars: 5, term: '银行流水 借贷关系', purpose: '用于检索资金交付与借贷关系认定' },
    { id: 'k4', stars: 4, term: '转账备注 借款', purpose: '用于检索转账备注的证明力' },
    { id: 'k5', stars: 4, term: '民间借贷 举证责任', purpose: '用于确认原告举证责任边界' },
    { id: 'k6', stars: 4, term: '仅有转账记录 借贷关系认定', purpose: '用于检索证据不足时的裁判规则' },
  ]

  const recommendedSites = [
    { id: 's1', stars: 5, name: '人民法院案例库', url: 'https://rmfyalk.court.gov.cn/', purpose: '优先查指导案例、典型案例、权威裁判规则' },
    { id: 's2', stars: 5, name: '中国裁判文书网', url: 'https://wenshu.court.gov.cn/', purpose: '检索各级法院真实裁判文书' },
    { id: 's3', stars: 4, name: '北大法宝', url: 'https://www.pkulaw.com/', purpose: '检索法律法规、司法解释和类案' },
    { id: 's4', stars: 4, name: '威科先行', url: 'https://law.wkinfo.com.cn/', purpose: '检索专业案例分析和法规注释' },
    { id: 's5', stars: 4, name: '最高人民法院官网', url: 'https://www.court.gov.cn/', purpose: '确认最新司法政策和司法解释' },
  ]

  const [copiedKeys, setCopiedKeys] = useState<Record<string, boolean>>({})
  const [siteNotifs, setSiteNotifs] = useState<Record<string, boolean>>({})
  // Planner states (M64)
  const [caseUnderstanding, setCaseUnderstanding] = useState<{
    type: string
    complexity: string
    currentStage: string
    confidence: number
  } | null>(null)
  const [disputeFocus, setDisputeFocus] = useState<Array<{ id: string; stars: number; title: string }>>([])
  const [searchStrategy, setSearchStrategy] = useState<{ priorities: string[]; expected: { cases: string; laws: string; interpretations: string } } | null>(null)
  const [generatedKeywords, setGeneratedKeywords] = useState<Array<{ id: string; term: string; source: string; stars: number }>>([])
  const [siteRecs, setSiteRecs] = useState<any[] | null>(null)
  const evidenceSuggestions = [
    { id: 'e1', stars: 5, title: '银行流水', desc: '用于补强资金交付事实' },
    { id: 'e2', stars: 5, title: '微信聊天原始记录', desc: '用于证明借贷合意' },
    { id: 'e3', stars: 4, title: '借条原件', desc: '用于证明借款关系' },
    { id: 'e4', stars: 3, title: '录音或证人证言', desc: '用于补充辅助证明' },
  ]
  const [joinedEvidence, setJoinedEvidence] = useState<Record<string, boolean>>({})
  const [whySearch, setWhySearch] = useState<string | null>(null)

  async function copyToClipboard(text: string) {
    try {
      await (navigator as any).clipboard.writeText(text)
      return true
    } catch (e) {
      return false
    }
  }

  function handleCopyKeyword(id: string, term: string) {
    copyToClipboard(term).then((ok) => {
      if (ok) {
        setCopiedKeys((p) => ({ ...p, [id]: true }))
        setTimeout(() => setCopiedKeys((p) => ({ ...p, [id]: false })), 2000)
      }
    })
  }

  function handleOpenSite(siteId: string, url: string) {
    // copy first recommended keyword if exists
    const first = recommendedKeywords[0]
    if (first) {
      copyToClipboard(first.term).then((ok) => {
        // show notification on site card
        setSiteNotifs((p) => ({ ...p, [siteId]: true }))
        setTimeout(() => setSiteNotifs((p) => ({ ...p, [siteId]: false })), 2000)
        // open regardless
        try { window.open(url, '_blank') } catch (e) { /* ignore */ }
      })
    } else {
      try { window.open(url, '_blank') } catch (e) { /* ignore */ }
    }
  }

  function handleJoinEvidence(id: string) {
    setJoinedEvidence((p) => ({ ...p, [id]: true }))
    setTimeout(() => setJoinedEvidence((p) => ({ ...p, [id]: false })), 2000)
  }

  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  const params = useParams()
  const router = useRouter()

  // fetched research entries from backend (defensive mapping)
  const [researches, setResearches] = useState<any[]>([])
  useEffect(() => {
    let cancelled = false
    async function loadResearch() {
      const matterId = (params as any)?.matter_id || (params as any)?.id || ''
      if (!matterId) return
      const base = (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:4000'
      const url = `${base}/matters/${encodeURIComponent(matterId)}/research`
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`status:${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          // expect array of research/knowledge records; defensive
          if (Array.isArray(json)) setResearches(json)
          else if (Array.isArray(json.result)) setResearches(json.result)
          else setResearches([])
        }
      } catch (e) {
        if (!cancelled) setResearches([])
      }
    }
    loadResearch()
    return () => { cancelled = true }
  }, [params])

  const realCases: CaseItem[] = (researches || []).filter((r: any) => {
    const cat = String(r?.category || r?.research_category || '').toLowerCase()
    return cat.includes('case') || cat.includes('similar') || /案|案例/.test(String(r?.title || ''))
  }).map((r: any) => ({
    id: String(r?.knowledge_id || r?.id || r?.research_id || r?.title || Math.random()),
    court: String(r?.source || '').trim() || '来源',
    case_no: String(r?.title || r?.research_no || ''),
    support: String(r?.version || r?.summary || r?.content || r?.result_url || ''),
    credibility: '★★★',
  }))
  const realCasesOrFallback: CaseItem[] = realCases.length > 0 ? realCases : cases

  const realLaws: LawItem[] = (researches || []).filter((r: any) => {
    const cat = String(r?.category || r?.research_category || '').toLowerCase()
    return cat.includes('law') || cat.includes('法规') || /法条|法规/.test(String(r?.title || ''))
  }).map((r: any) => ({
    id: String(r?.knowledge_id || r?.id || r?.research_id || r?.title || Math.random()),
    title: String(r?.title || r?.name || ''),
    excerpt: String(r?.content_uri || r?.excerpt || r?.summary || ''),
    applicability: String(r?.status || r?.version || '适用'),
  }))

  const realLawsOrFallback: LawItem[] = realLaws.length > 0 ? realLaws : laws

  const logContainerRef = useRef<HTMLDivElement | null>(null)
  const rightContainerRef = useRef<HTMLDivElement | null>(null)
  const legalOpinionRef = useRef<HTMLDivElement | null>(null)
  const analysisSummaryRef = useRef<HTMLDivElement | null>(null)
  const [analysisSummary, setAnalysisSummary] = useState<{
    cases: number
    laws: number
    interpretations: number
    rules: number
    opposing: number
    risks: number
    loading?: boolean
  } | null>(null)

  const realAnalysisSummary = (researches || []).reduce((acc: any, r: any) => {
    try {
      const cat = String(r?.category || r?.research_category || '').toLowerCase()
      if (cat.includes('analysis') || cat.includes('summary') || /分析|汇总/.test(String(r?.title || ''))) {
        const cases = Number(r?.cases || r?.cases_count || r?.case_count || 0)
        const laws = Number(r?.laws || r?.laws_count || r?.law_count || 0)
        const interpretations = Number(r?.interpretations || r?.interpretations_count || 0)
        const rules = Number(r?.rules || r?.rules_count || 0)
        const opposing = Number(r?.opposing || r?.opposing_count || 0)
        const risks = Number(r?.risks || r?.risks_count || 0)
        return {
          cases: acc.cases + (isNaN(cases) ? 0 : cases),
          laws: acc.laws + (isNaN(laws) ? 0 : laws),
          interpretations: acc.interpretations + (isNaN(interpretations) ? 0 : interpretations),
          rules: acc.rules + (isNaN(rules) ? 0 : rules),
          opposing: acc.opposing + (isNaN(opposing) ? 0 : opposing),
          risks: acc.risks + (isNaN(risks) ? 0 : risks),
        }
      }
    } catch (e) { }
    return acc
  }, { cases: 0, laws: 0, interpretations: 0, rules: 0, opposing: 0, risks: 0 })

  const realAnalysisSummaryOrFallback = Object.keys(realAnalysisSummary).length ? realAnalysisSummary : analysisSummary
  useEffect(() => {
    const el = logContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  // UI helpers
  function pushLog(line: string) {
    setLogs((p) => [...p, `${new Date().toLocaleTimeString()} · ${line}`])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const list = Array.from(e.dataTransfer.files || [])
    if (list.length) {
      setFiles((p) => p.concat(list))
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || [])
    if (list.length) {
      setFiles((p) => p.concat(list))
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const txt = e.clipboardData.getData('text')
    if (txt) setTextInput((p) => (p ? p + '\n' + txt : txt))
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // Phase 1: AI understands case and prepares search strategy
  async function startPhase1() {
    if (aiRunning) return
    setPhase('phase1')
    setAiRunning(true)
    setAiCompleted(false)
    setLegalOpinion(null)
    setCases([])
    setLaws([])
    setNextActions([])
    setAnalysisSummary({ cases: 0, laws: 0, interpretations: 0, rules: 0, opposing: 0, risks: 0, loading: true })
    // clear planner modules
    setCaseUnderstanding(null)
    setDisputeFocus([])
    setSearchStrategy(null)
    setGeneratedKeywords([])
    setSiteRecs(null)
    setJoinedEvidence({})
    setWhySearch(null)

    setLogs(['AI 等待开始……'])
    pushLog('AI 开始理解案件')

    const stages = [
      '理解案件材料',
      '识别案件类型',
      '识别争议焦点',
      '发现证据缺口',
      '制定检索策略',
      '生成检索词',
      '推荐检索网站',
    ]

    const totalMs = 6000
    const perStage = Math.max(400, Math.floor(totalMs / stages.length))

    for (let i = 0; i < stages.length; i++) {
      const s = stages[i]
      setAiStage(s)
      setAiTask(s)
      pushLog(`AI ${s}`)
      setCopilotText('我正在识别案件类型、争议焦点和证据缺口。')

      const steps = 4
      for (let k = 0; k < steps; k++) {
        await new Promise((r) => setTimeout(r, Math.floor(perStage / steps)))
        const overall = Math.round(((i + (k + 1) / steps) / stages.length) * 100)
        setAiProgress(overall)
      }

      if (s === '识别案件类型') {
        setCaseUnderstanding({ type: '民间借贷纠纷', complexity: '★★★★☆', currentStage: '证据整理阶段', confidence: 91 })
      }
      if (s === '识别争议焦点') {
        setDisputeFocus([
          { id: 'f1', stars: 5, title: '借贷关系是否成立' },
          { id: 'f2', stars: 4, title: '银行流水证明力' },
          { id: 'f3', stars: 4, title: '微信聊天真实性' },
          { id: 'f4', stars: 3, title: '借款金额是否一致' },
        ])
      }
      if (s === '制定检索策略') {
        setSearchStrategy({ priorities: ['借贷关系成立标准', '微信聊天证明力', '转账备注证明力', '原告举证责任'], expected: { cases: '20+', laws: '8+', interpretations: '4+' } })
      }
      if (s === '生成检索词') {
        setGeneratedKeywords([
          { id: 'g1', term: '借贷关系成立标准', source: '基于案件类型、争议焦点和证据缺口生成', stars: 5 },
          { id: 'g2', term: '微信聊天记录 证明力', source: '基于案件类型、争议焦点和证据缺口生成', stars: 5 },
          { id: 'g3', term: '转账备注 证明力', source: '基于案件类型、争议焦点和证据缺口生成', stars: 4 },
          { id: 'g4', term: '银行流水 借贷关系', source: '基于案件类型、争议焦点和证据缺口生成', stars: 5 },
          { id: 'g5', term: '原告举证责任 民间借贷', source: '基于案件类型、争议焦点和证据缺口生成', stars: 4 },
          { id: 'g6', term: '转账备注 证明力 案例', source: '基于案件类型、争议焦点和证据缺口生成', stars: 4 },
        ])
      }
      if (s === '推荐检索网站') {
        setSiteRecs([
          { id: 's1', stars: 5, name: '人民法院案例库', url: 'https://rmfyalk.court.gov.cn/', purpose: '优先查指导案例、典型案例、权威裁判规则', reason: '优先检索权威案例和指导性裁判规则' },
          { id: 's2', stars: 5, name: '中国裁判文书网', url: 'https://wenshu.court.gov.cn/', purpose: '检索各级法院真实裁判文书', reason: '检索同类案件真实裁判文书' },
          { id: 's3', stars: 4, name: '北大法宝', url: 'https://www.pkulaw.com/', purpose: '检索法律法规、司法解释和类案', reason: '补充法条、司法解释和裁判观点' },
          { id: 's4', stars: 4, name: '威科先行', url: 'https://law.wkinfo.com.cn/', purpose: '检索专业案例分析和法规注释', reason: '检索专业注释与分析' },
          { id: 's5', stars: 4, name: '最高人民法院官网', url: 'https://www.court.gov.cn/', purpose: '确认最新司法政策和司法解释', reason: '确认最新司法政策' },
        ])
      }
      if (s === '发现证据缺口') {
        setWhySearch('当前材料已经可以初步证明双方存在资金往来和借贷沟通，但银行流水、交易备注与聊天记录原始性仍是关键证据缺口。因此建议优先检索借贷关系成立标准、微信聊天记录证明力、转账备注证明力和原告举证责任，以判断当前证据链是否足以支持起诉策略。')
      }
    }

    // phase1 complete: wait for human
    setAiProgress(100)
    pushLog('AI 制定检索策略完成，等待律师检索')
    setCopilotText('我已经完成检索策略，请律师手动检索后把结果交给我继续分析。')
    setAiStage('等待律师检索')
    setAiTask('等待律师提交检索结果')
    setPhase('awaiting_human')
    setAiRunning(false)
  }

  // Phase 2: AI analyzes submitted search results
  async function startPhase2() {
    if (aiRunning) return
    setPhase('phase2')
    setAiRunning(true)
    pushLog('律师提交检索结果')
    pushLog('AI 开始分析检索结果')
    setCopilotText('我正在分析案例、法条和裁判规则。')

    const stages = [
      '分析检索结果',
      '提取裁判规则',
      '匹配法条',
      '生成法律意见',
      '推荐下一步',
    ]

    const totalMs = 7000
    const perStage = Math.max(400, Math.floor(totalMs / stages.length))

    for (let i = 0; i < stages.length; i++) {
      const s = stages[i]
      setAiStage(s)
      setAiTask(s)
      pushLog(`AI ${s}`)

      const steps = 5
      for (let k = 0; k < steps; k++) {
        await new Promise((r) => setTimeout(r, Math.floor(perStage / steps)))
        const overall = Math.round(((i + (k + 1) / steps) / stages.length) * 100)
        setAiProgress(overall)
      }
    }

    // set final outputs
    setAnalysisSummary({ cases: 18, laws: 6, interpretations: 3, rules: 9, opposing: 2, risks: 3, loading: false })
    setLegalOpinion(
      '法律意见：\n基于检索结果与现有材料，借款关系成立可能性较大；建议优先补强银行流水并固定聊天记录。\n\n风险分析：\n主要风险为部分证据证明力不足，需补强书证和原始聊天记录。\n\n建议策略：\n1) 补齐并整理银行流水；2) 固定聊天记录并制作时间线；3) 准备比对表与意见书用于庭前沟通。'
    )
    setCases([
      { id: 'c1', court: '最高人民法院', case_no: '(2020)最高法指A', support: '高度支持', credibility: '★★★★★' },
      { id: 'c2', court: '北京市高级法院', case_no: '(2019)京高法B', support: '支持', credibility: '★★★★' },
      { id: 'c3', court: '某地方法院', case_no: '(2018)地方法C', support: '部分支持', credibility: '★★★' },
    ])
    setLaws([
      { id: 'l1', title: '民法典 — 借贷相关', excerpt: '关于借款举证与认定的核心条款', applicability: '高度适用' },
      { id: 'l2', title: '民事诉讼法 — 证据规则', excerpt: '证据采信与证明力说明', applicability: '适用' },
      { id: 'l3', title: '最高院司法解释 — 借贷举证', excerpt: '关于借贷关系认定的解释要点', applicability: '高度适用' },
    ])
    setNextActions([
      { id: 'n1', title: '补齐银行流水并整理证据包', successRate: 88, eta: '30 分钟' },
      { id: 'n2', title: '固定聊天记录并整理时间线', successRate: 72, eta: '20 分钟' },
      { id: 'n3', title: '生成比对表并撰写意见书', successRate: 65, eta: '45 分钟' },
    ])

    await new Promise((r) => setTimeout(r, 200))
    if (!mountedRef.current) return
    setAiStage('完成')
    setAiTask('已完成')
    setAiCompleted(true)
    setAiRunning(false)
    setPhase('done')

    // scroll to analysis summary
    try {
      if (analysisSummaryRef.current) analysisSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (e) { }
    setCopilotText('法律研究已完成，建议进入文书工作区。');
  }

  return (
    <main style={{ padding: 20, background: lawdesk.pageBg, minHeight: '80vh' }}>
      <div style={{ padding: 16, borderRadius: 12, background: lawdesk.cardBg, border: `1px solid ${lawdesk.border}` }}>
        <h2 style={{ margin: 0 }}>案件检索 · AI 工作区</h2>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'stretch' }}>
        {/* Left column - 40% */}
        <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 'calc(100vh - 180px)' }}>
          {/* AI Runtime */}
          <div style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
            <div style={{ fontWeight: 800, color: lawdesk.text }}>AI Runtime</div>
            <div style={{ marginTop: 8, color: lawdesk.muted }}><strong>当前阶段：</strong>{aiStage}</div>
            <div style={{ marginTop: 6, color: lawdesk.muted }}><strong>当前任务：</strong>{aiTask}</div>
            <div style={{ marginTop: 10 }}>
              {aiProgress === 0 && !aiRunning ? (
                <div style={{ color: lawdesk.muted }}>
                  AI 已准备就绪 · 等待律师上传材料。
                  <div style={{ marginTop: 6 }}>
                    支持：✓ PDF &nbsp; ✓ Word &nbsp; ✓ 图片 &nbsp; ✓ 网页内容
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ height: 12, background: '#eef2f6', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${aiProgress}%`, height: '100%', background: lawdesk.blue }} />
                  </div>
                  <div style={{ marginTop: 6, textAlign: 'right', color: lawdesk.muted }}>{aiProgress}%</div>
                </>
              )}
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button
                onClick={phase === 'idle' ? startPhase1 : undefined}
                disabled={aiRunning || phase !== 'idle'}
                style={{ padding: '8px 12px', borderRadius: 6, background: lawdesk.blue, color: '#fff', border: 'none', cursor: phase === 'idle' ? 'pointer' : 'default' }}
              >
                {phase === 'idle' ? '开始 AI 理解案件' : phase === 'phase1' ? 'AI 正在理解……' : phase === 'awaiting_human' ? '等待律师检索' : phase === 'phase2' ? 'AI 正在分析……' : '已完成'}
              </button>
            </div>
          </div>
          {/* Upload Area / Human Node */}
          {phase === 'awaiting_human' ? (
            <div style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}`, minHeight: 180 }}>
              <div style={{ fontWeight: 800, color: lawdesk.text }}>等待律师检索</div>
              <div style={{ marginTop: 8, color: lawdesk.muted }}>请根据 AI 推荐检索词和推荐网站完成手动检索，然后上传或粘贴检索结果。</div>
              <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="在此粘贴检索到的结果或摘要" style={{ width: '100%', height: 100, marginTop: 8, padding: 8, borderRadius: 6, border: `1px solid ${lawdesk.border}` }} />
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: 6, cursor: 'pointer' }}>
                  上传检索结果
                  <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} />
                </label>
                <div style={{ color: lawdesk.muted }}>{files.length} 个文件</div>
                <div style={{ marginLeft: 'auto' }}>
                  <button onClick={() => { pushLog('律师提交检索结果'); startPhase2() }} style={{ padding: '8px 12px', borderRadius: 6, background: lawdesk.blue, color: '#fff', border: 'none' }}>提交检索结果给 AI 分析</button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onPaste={handlePaste}
              style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}`, minHeight: 180, cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 800, color: lawdesk.text }}>上传材料</div>
              <div style={{ marginTop: 8, color: lawdesk.muted }}>拖拽 PDF、上传 Word/图片，或粘贴网页内容（Ctrl+V）。</div>
              <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="在此粘贴检索到的网页或文本" style={{ width: '100%', height: 100, marginTop: 8, padding: 8, borderRadius: 6, border: `1px solid ${lawdesk.border}` }} />
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: 6, cursor: 'pointer' }}>
                  上传文件
                  <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} />
                </label>
                <div style={{ color: lawdesk.muted }}>{files.length} 个文件</div>
              </div>
            </div>
          )}

          {/* Live Log */}
          <div ref={logContainerRef} style={{ background: lawdesk.cardBg, padding: 20, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}`, overflow: 'auto', flex: 1 }}>
            <div style={{ fontWeight: 800, color: lawdesk.text }}>Live Log</div>
            <div style={{ marginTop: 8, color: lawdesk.muted }}>
              {logs.map((l, i) => (
                <div key={i} style={{ fontSize: 13, color: lawdesk.muted, padding: '6px 0', borderBottom: `1px dashed ${lawdesk.border}` }}>{l}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column - 60% */}
        <div ref={rightContainerRef} style={{ flex: '1 1 60%', display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
          {/* AI Copilot */}
          <div style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
            <div style={{ fontWeight: 800, color: lawdesk.text }}>AI Copilot</div>
            <div style={{ marginTop: 8, color: lawdesk.text }}>{copilotText}</div>
          </div>

          {/* M67 Phase1: AI 诉讼目标 */}
          <div style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
            <div style={{ fontWeight: 800, color: lawdesk.text }}>AI 诉讼目标</div>
            <div style={{ marginTop: 8 }}>
              <div style={{ color: lawdesk.text }}>
                <div><strong>Primary Goal：</strong>请求确认借贷关系成立</div>
                <div style={{ marginTop: 8 }}><strong>Secondary Goals：</strong></div>
                <ul style={{ marginTop: 6, color: lawdesk.muted }}>
                  <li>返还借款本金</li>
                  <li>支付逾期利息</li>
                  <li>承担诉讼费用</li>
                </ul>
              </div>
            </div>
          </div>

          {/* M67 Phase1: AI 证明体系（Proof Map） */}
          <div style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
            <div style={{ fontWeight: 800, color: lawdesk.text }}>AI 证明体系（Proof Map）</div>
            <div style={{ marginTop: 8 }}>
              {/* Static tree view for Proof Map */}
              <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: `1px solid ${lawdesk.border}`, color: lawdesk.text }}>
                <div style={{ fontWeight: 800 }}>借贷关系成立</div>
                <div style={{ marginLeft: 12, marginTop: 8 }}>
                  <div>├── 借款合意</div>
                  <div style={{ marginLeft: 18 }}>├── 微信聊天</div>
                  <div style={{ marginLeft: 18 }}>├── 借条</div>
                  <div style={{ marginLeft: 18 }}>└── 录音</div>
                  <div style={{ marginTop: 6 }}>├── 资金交付</div>
                  <div style={{ marginLeft: 18 }}>├── 转账记录</div>
                  <div style={{ marginLeft: 18 }}>└── 银行流水</div>
                  <div style={{ marginTop: 6 }}>└── 未归还</div>
                  <div style={{ marginLeft: 18 }}>├── 催款聊天</div>
                  <div style={{ marginLeft: 18 }}>└── 对方未还款回复</div>
                </div>
              </div>
            </div>
          </div>

          {/* M67 Phase1: AI 证据缺口分析 */}
          <div style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
            <div style={{ fontWeight: 800, color: lawdesk.text }}>AI 证据缺口分析</div>
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 120, color: lawdesk.muted }}>证据完成度</div>
                <div style={{ flex: 1, background: '#eef2f6', height: 12, borderRadius: 6 }}>
                  <div style={{ width: '68%', height: '100%', background: lawdesk.blue, borderRadius: 6 }} />
                </div>
                <div style={{ color: lawdesk.muted }}>68%</div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, background: '#fff', padding: 10, borderRadius: 8, border: `1px solid ${lawdesk.border}` }}>
                  <div style={{ fontWeight: 700 }}>已有证据</div>
                  <ul style={{ marginTop: 6, color: lawdesk.muted }}>
                    <li>微信聊天</li>
                    <li>转账记录</li>
                  </ul>
                </div>
                <div style={{ flex: 1, background: '#fff', padding: 10, borderRadius: 8, border: `1px solid ${lawdesk.border}` }}>
                  <div style={{ fontWeight: 700 }}>缺失证据</div>
                  <ul style={{ marginTop: 6, color: lawdesk.muted }}>
                    <li>借条</li>
                    <li>录音</li>
                    <li>完整银行流水</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* M67 Phase1: AI 任务分配（AI / 律师） */}
          <div style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
            <div style={{ fontWeight: 800, color: lawdesk.text }}>AI 任务分配（AI / 律师）</div>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: `1px solid ${lawdesk.border}` }}>
                <div style={{ fontWeight: 800 }}>AI 负责</div>
                <ul style={{ marginTop: 6, color: lawdesk.muted }}>
                  <li>检索司法解释</li>
                  <li>检索最高院案例</li>
                  <li>总结裁判规则</li>
                </ul>
              </div>
              <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: `1px solid ${lawdesk.border}` }}>
                <div style={{ fontWeight: 800 }}>律师负责</div>
                <ul style={{ marginTop: 6, color: lawdesk.muted }}>
                  <li>登录法院案例库</li>
                  <li>完成人机验证</li>
                  <li>联系客户补证</li>
                </ul>
              </div>
            </div>
            <div style={{ marginTop: 8, color: lawdesk.muted }}>部分网站需要登录、验证码或客户沟通，必须由律师完成。</div>
            {/* 推荐检索资源（降级展示） */}
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontWeight: 700, color: lawdesk.text }}>推荐检索资源</div>
              {(siteRecs ?? recommendedSites).map((s) => (
                <div key={s.id} style={{ padding: 8, background: '#fff', borderRadius: 8, border: `1px solid ${lawdesk.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: lawdesk.text }}>{s.name} · <span style={{ color: lawdesk.muted }}>{s.purpose}</span></div>
                  <div>
                    <button onClick={() => handleOpenSite(s.id, s.url)} style={{ padding: '6px 10px', borderRadius: 6, background: lawdesk.blue, color: '#fff', border: 'none' }}>打开</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* M67 Phase1: Litigation Plan（诉讼路线图） */}
          <div style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
            <div style={{ fontWeight: 800, color: lawdesk.text }}>Litigation Plan（诉讼路线图）</div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: `1px solid ${lawdesk.border}` }}>
                <div style={{ fontWeight: 700 }}>① 固定微信聊天记录</div>
                <div style={{ marginTop: 6, color: lawdesk.muted }}>AI 建议：固定原始聊天以保留时间戳和原始性，提升证明力。</div>
              </div>
              <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: `1px solid ${lawdesk.border}` }}>
                <div style={{ fontWeight: 700 }}>② 补充银行流水</div>
                <div style={{ marginTop: 6, color: lawdesk.muted }}>AI 建议：完整流水能证明资金往来与入账情况，是资金交付关键证据。</div>
              </div>
              <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: `1px solid ${lawdesk.border}` }}>
                <div style={{ fontWeight: 700 }}>③ 补充借条或录音</div>
                <div style={{ marginTop: 6, color: lawdesk.muted }}>AI 建议：书面借条或录音能直接证明借款合意，显著增强举证链。</div>
              </div>
              <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: `1px solid ${lawdesk.border}` }}>
                <div style={{ fontWeight: 700 }}>④ 完成类案检索</div>
                <div style={{ marginTop: 6, color: lawdesk.muted }}>AI 建议：检索最高院与指导案例以寻找支持本案的裁判规则与观点。</div>
              </div>
              <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: `1px solid ${lawdesk.border}` }}>
                <div style={{ fontWeight: 700 }}>⑤ 起草起诉状</div>
                <div style={{ marginTop: 6, color: lawdesk.muted }}>AI 建议：基于已收集证据草拟起诉状，明确请求与事实依据。</div>
              </div>
              <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: `1px solid ${lawdesk.border}` }}>
                <div style={{ fontWeight: 700 }}>⑥ 庭前准备</div>
                <div style={{ marginTop: 6, color: lawdesk.muted }}>AI 建议：整理证据目录、比对表并准备证人证言与证据质证要点。</div>
              </div>
              <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: `1px solid ${lawdesk.border}` }}>
                <div style={{ fontWeight: 700 }}>⑦ 开庭</div>
                <div style={{ marginTop: 6, color: lawdesk.muted }}>AI 建议：庭审重点围绕资金交付与借款合意的证据链条进行组织质证。</div>
              </div>
            </div>
          </div>

          {/* AI 建议补充证据 */}
          <div style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
            <div style={{ fontWeight: 800, color: lawdesk.text }}>AI 建议补充证据</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {evidenceSuggestions.map((e) => (
                <div key={e.id} style={{ padding: 10, background: '#fff', border: `1px solid ${lawdesk.border}`, borderRadius: 8, minWidth: 200 }}>
                  <div style={{ fontWeight: 800 }}>{'★'.repeat(e.stars) + '☆'.repeat(5 - e.stars)}</div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>{e.title}</div>
                  <div style={{ marginTop: 6, color: lawdesk.muted }}>{e.desc}</div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => handleJoinEvidence(e.id)} style={{ padding: '6px 10px', borderRadius: 6, background: lawdesk.blue, color: '#fff', border: 'none' }}>加入待办</button>
                    {joinedEvidence[e.id] ? <div style={{ color: lawdesk.muted }}>已加入</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 为什么这样诉讼 */}
          <div style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
            <div style={{ fontWeight: 800, color: lawdesk.text }}>为什么这样诉讼</div>
            <div style={{ marginTop: 8, color: lawdesk.muted }}>{whySearch ?? '等待 AI 给出诉讼策略与证据缺口的理由'}</div>
          </div>

          {/* AI Analysis Summary (Phase 2 outputs) */}
          {(phase === 'phase2' || phase === 'done') && (
            <div ref={analysisSummaryRef} style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
              <div style={{ fontWeight: 800, color: lawdesk.text }}>AI 分析结果</div>
              <div style={{ marginTop: 8 }}>
                {realAnalysisSummaryOrFallback == null ? (
                  <div style={{ color: lawdesk.muted }}>AI 将在分析完成后汇总：• 案例数量 • 法条数量 • 裁判规则 • 风险提示</div>
                ) : realAnalysisSummaryOrFallback.loading ? (
                  <div style={{ color: lawdesk.muted }}>分析中……</div>
                ) : (
                  <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <div style={{ padding: 10, background: '#fff', border: `1px solid ${lawdesk.border}`, borderRadius: 8 }}>案例：<div style={{ fontWeight: 800, marginTop: 6 }}>{realAnalysisSummaryOrFallback.cases}</div></div>
                    <div style={{ padding: 10, background: '#fff', border: `1px solid ${lawdesk.border}`, borderRadius: 8 }}>法条：<div style={{ fontWeight: 800, marginTop: 6 }}>{realAnalysisSummaryOrFallback.laws}</div></div>
                    <div style={{ padding: 10, background: '#fff', border: `1px solid ${lawdesk.border}`, borderRadius: 8 }}>司法解释：<div style={{ fontWeight: 800, marginTop: 6 }}>{realAnalysisSummaryOrFallback.interpretations}</div></div>
                    <div style={{ padding: 10, background: '#fff', border: `1px solid ${lawdesk.border}`, borderRadius: 8 }}>裁判规则：<div style={{ fontWeight: 800, marginTop: 6 }}>{realAnalysisSummaryOrFallback.rules}</div></div>
                    <div style={{ padding: 10, background: '#fff', border: `1px solid ${lawdesk.border}`, borderRadius: 8 }}>相反观点：<div style={{ fontWeight: 800, marginTop: 6 }}>{realAnalysisSummaryOrFallback.opposing}</div></div>
                    <div style={{ padding: 10, background: '#fff', border: `1px solid ${lawdesk.border}`, borderRadius: 8 }}>风险提示：<div style={{ fontWeight: 800, marginTop: 6 }}>{realAnalysisSummaryOrFallback.risks}</div></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Legal Opinion (Phase 2) */}
          {(phase === 'phase2' || phase === 'done') && (
            <div ref={legalOpinionRef} style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
              <div style={{ fontWeight: 800, color: lawdesk.text }}>Legal Opinion</div>
              {legalOpinion ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>法律意见</div>
                  <div style={{ color: lawdesk.muted }}>{legalOpinion}</div>
                </div>
              ) : (
                <div style={{ marginTop: 8, color: lawdesk.muted }}>等待 AI 分析。分析完成后这里将自动生成：• 法律意见 • 风险分析 • 起诉建议</div>
              )}
            </div>
          )}

          {/* Cases (Phase 2) */}
          {(phase === 'phase2' || phase === 'done') && (
            <div style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
              <div style={{ fontWeight: 800, color: lawdesk.text }}>Cases</div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {realCasesOrFallback.length === 0 ? (
                  <div style={{ color: lawdesk.muted }}>
                    AI 将推荐：<br />★★★★★ 指导案例<br />★★★★★ 最高院案例<br />★★★★ 地方法院案例
                  </div>
                ) : realCasesOrFallback.map((c) => (
                  <div key={c.id} style={{ border: `1px solid ${lawdesk.border}`, padding: 10, borderRadius: 8, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{c.court} · {c.case_no}</div>
                      <div style={{ marginTop: 6, color: lawdesk.muted }}>观点：{c.support}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <div style={{ color: lawdesk.muted }}>可信度：{c.credibility}</div>
                      <button style={{ padding: '6px 10px', borderRadius: 6, background: lawdesk.blue, color: '#fff', border: 'none' }}>加入文书</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Laws (Phase 2) */}
          {(phase === 'phase2' || phase === 'done') && (
            <div style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
              <div style={{ fontWeight: 800, color: lawdesk.text }}>Laws</div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {realLawsOrFallback.length === 0 ? (
                  <div style={{ color: lawdesk.muted }}>AI 将自动匹配：<br />民法典<br />民事诉讼法<br />司法解释</div>
                ) : realLawsOrFallback.map((l) => (
                  <div key={l.id} style={{ border: `1px solid ${lawdesk.border}`, padding: 10, borderRadius: 8, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{l.title}</div>
                      <div style={{ marginTop: 6, color: lawdesk.muted }}>{l.excerpt}</div>
                      <div style={{ marginTop: 6, color: lawdesk.muted }}>适用程度：{l.applicability}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <button style={{ padding: '6px 10px', borderRadius: 6, background: lawdesk.blue, color: '#fff', border: 'none' }}>加入文书</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Next Actions (Phase 2) */}
          {(phase === 'phase2' || phase === 'done') && (
            <div style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
              <div style={{ fontWeight: 800, color: lawdesk.text }}>AI Next Actions</div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {nextActions.length === 0 ? (
                  <div style={{ color: lawdesk.muted }}>AI 将根据分析结果，自动推荐下一步工作。</div>
                ) : nextActions.slice(0, 3).map((n) => (
                  <div key={n.id} style={{ border: `1px solid ${lawdesk.border}`, padding: 10, borderRadius: 8, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{n.title}</div>
                      <div style={{ marginTop: 6, color: lawdesk.muted }}>成功率：{n.successRate}% · 预计耗时：{n.eta}</div>
                    </div>
                    <div>
                      <button style={{ padding: '6px 10px', borderRadius: 6, background: lawdesk.blue, color: '#fff', border: 'none' }}>立即开始</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 案件研究完成收尾卡片（替换原有下一步入口） */}
          {phase === 'done' && (
            <div style={{ background: lawdesk.cardBg, padding: 16, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}`, marginTop: 8 }}>
              <div style={{ fontWeight: 800, color: lawdesk.text }}>案件研究完成</div>
              <div style={{ marginTop: 8, color: lawdesk.muted }}>AI 已完成本案研究。</div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700 }}>完成事项：</div>
                <ul style={{ marginTop: 6, color: lawdesk.muted }}>
                  <li>✓ 案件材料分析</li>
                  <li>✓ 证据体系梳理</li>
                  <li>✓ 类案检索</li>
                  <li>✓ 法律法规检索</li>
                  <li>✓ 裁判规则整理</li>
                  <li>✓ 诉讼路线规划</li>
                  <li>✓ 风险分析</li>
                </ul>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700 }}>下一步：</div>
                <div style={{ marginTop: 6, color: lawdesk.muted }}>开始起草法律文书。</div>
                <div style={{ marginTop: 8, color: lawdesk.muted }}>进入文书工作区后，AI 将基于本次研究结果，协助律师起草第一版法律文书。包括：</div>
                <ul style={{ marginTop: 6, color: lawdesk.muted }}>
                  <li>• 自动继承本次检索成果</li>
                  <li>• 自动引用相关法条与案例</li>
                  <li>• 自动结合诉讼路线</li>
                  <li>• 自动生成第一版起诉状草稿</li>
                </ul>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button onClick={() => {
                  try {
                    const id = (params as any)?.matter_id || (params as any)?.id || ''
                    if (!id) return
                    router.push(`/matters/${id}/documents`)
                  } catch (e) { }
                }} style={{ padding: '10px 14px', borderRadius: 6, background: lawdesk.blue, color: '#fff', border: 'none' }}>进入文书工作区</button>

                <button style={{ padding: '10px 14px', borderRadius: 6, background: '#f1f5f9', color: lawdesk.muted, border: 'none' }}>继续完善研究</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
