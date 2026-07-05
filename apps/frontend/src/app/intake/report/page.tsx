
"use client"

import React from 'react'
import { useRouter } from 'next/navigation'

type IntakeAnalysis = {
  title: string
  matter_type: string
  plaintiff?: string
  defendant?: string
  dispute_amount?: string
  overview: { case_type: string; requested: string; court?: string; period?: string }
  ai_summary: string
  evidence: { completeness: number; have: string[]; missing: string[] }
  risks: Array<{ title: string; impact: string }>
  win_assessment: { score: number; comment: string }
  recommendation: string
  fee_suggestion: string
  next_actions: string[]
  score: number
}

const mockIntakeAnalysis: IntakeAnalysis = {
  title: '张三诉李四 民间借贷纠纷',
  matter_type: '民间借贷纠纷',
  plaintiff: '张三',
  defendant: '李四',
  dispute_amount: '100000 元',
  overview: {
    case_type: '民间借贷纠纷',
    requested: '本金 100,000 元',
    court: '待定',
    period: '4~6 个月',
  },
  ai_summary: '基于客户提供的信息，案件属于典型的民间借贷纠纷，证据链较为完整，优先补强被告身份信息与催款证据。',
  evidence: {
    completeness: 86,
    have: ['银行流水', '微信聊天记录', '借款承认'],
    missing: ['被告身份信息', '催款记录', '利息约定'],
  },
  risks: [
    { title: '未签正式借条', impact: '中' },
    { title: '身份信息不足', impact: '低' },
    { title: '利息约定不明确', impact: '低' },
  ],
  win_assessment: { score: 78, comment: '证据支持主要请求，但仍需补强关键证据以提高胜诉率。' },
  recommendation: '建议接案，同时补充证据并准备起诉材料。',
  fee_suggestion: '建议预付款 10,000 元 + 成功后按阶段收费',
  next_actions: ['补充被告身份信息', '上传银行流水', '整理微信聊天记录'],
  score: 92,
}

function Stars({ rating }: { rating: number }) {
  const total = 5
  return (
    <div style={{ color: '#2563eb', fontSize: 16 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{ color: i < rating ? '#2563eb' : '#e5e7eb', marginRight: 2 }}>★</span>
      ))}
    </div>
  )
}

function EvidenceRow({ name, stars }: { name: string; stars: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderRadius: 8 }}>
      <div style={{ fontWeight: 600 }}>{name}</div>
      <div><Stars rating={stars} /></div>
    </div>
  )
}

function impactToStars(impact: string) {
  const m = impact.toLowerCase()
  if (m.includes('高')) return 4
  if (m.includes('中')) return 3
  if (m.includes('低')) return 2
  return 2
}

function recommendationForRisk(title: string) {
  if (title.includes('借条')) return '微信聊天可作为补强。'
  if (title.includes('身份')) return '建议上传身份证。'
  if (title.includes('利息')) return '建议按 LPR 主张。'
  return '请补充相关证据或备注，便于律师评估。'
}

export default function ReportPage() {
  const router = useRouter()
  // prefer persisted analysis if available
  let analysis: IntakeAnalysis = mockIntakeAnalysis
  try {
    const stored = sessionStorage.getItem('intake_analysis')
    if (stored) analysis = JSON.parse(stored) as IntakeAnalysis
    else sessionStorage.setItem('intake_analysis', JSON.stringify(mockIntakeAnalysis))
  } catch (e) {
    // ignore
  }

  return (
    <main>
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
        <h2>AI 接案分析报告</h2>
        <div style={{ color: '#6b7280', marginTop: 6 }}>LawDesk 已完成客户咨询分析，并生成接案建议。</div>

        <div style={{ marginTop: 20, display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr' }}>
          {/* 顶部 Summary Card */}
          <div style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 10, padding: 18, border: '1px solid #eef2ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ fontSize: 22, color: '#2563eb', fontWeight: 800 }}>★★★★★</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>建议接案</div>
                <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{analysis.title}</div>
                <div style={{ marginTop: 8, color: '#6b7280', display: 'flex', gap: 12 }}>
                  <div>案件类型：{analysis.matter_type.replace('纠纷','').trim()}</div>
                  <div>争议金额：{analysis.dispute_amount || analysis.overview.requested}</div>
                  <div>原告：{analysis.plaintiff || '—'}</div>
                  <div>被告：{analysis.defendant || '—'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Chief 判断（Checklist） */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eef2ff' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>AI Chief 判断</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>✓ 借贷关系成立</div>
              <div>✓ 银行流水可以证明付款</div>
              <div>✓ 微信聊天可以证明借款</div>
              <div>✓ 当前证据基本满足起诉条件</div>
              <div>✓ 建议补充身份证信息</div>
            </div>
          </div>

          {/* AI 总结与案件分析 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eef2ff' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>AI 总结</div>
              <div>{analysis.ai_summary}</div>
            </div>

            <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eef2ff' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>案件概况</div>
              <div style={{ marginTop: 6 }}><strong>案件类型</strong> {analysis.overview.case_type}</div>
              <div style={{ marginTop: 6 }}><strong>诉讼请求</strong> {analysis.overview.requested}</div>
              <div style={{ marginTop: 6 }}><strong>法院</strong> {analysis.overview.court || '待定'}</div>
              <div style={{ marginTop: 6 }}><strong>预计周期</strong> {analysis.overview.period || '—'}</div>
            </div>
          </div>

          {/* 证据分析 */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eef2ff' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>证据分析</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <EvidenceRow name="银行流水" stars={5} />
              <EvidenceRow name="微信聊天" stars={5} />
              <EvidenceRow name="借条" stars={1} />
              <EvidenceRow name="身份证" stars={3} />
              <EvidenceRow name="催款记录" stars={2} />
            </div>
          </div>

          {/* 法律风险 列表（每个作为 Card）*/}
          <div style={{ background: 'transparent', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, gridColumn: '1 / -1' }}>
            {analysis.risks.map((r) => (
              <div key={r.title} style={{ background: '#fff', borderRadius: 10, padding: 12, border: '1px solid #eef2ff' }}>
                <div style={{ fontWeight: 700 }}>{r.title}</div>
                <div style={{ marginTop: 8 }}>风险等级</div>
                <div style={{ marginTop: 6 }}><Stars rating={impactToStars(r.impact)} /></div>
                <div style={{ marginTop: 8, fontWeight: 700 }}>AI建议：</div>
                <div style={{ marginTop: 6 }}>{recommendationForRisk(r.title)}</div>
              </div>
            ))}
          </div>

          {/* 胜诉评估 & 接案建议 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eef2ff' }}>
              <div style={{ fontWeight: 700 }}>胜诉评估</div>
              <div style={{ marginTop: 8 }}><Stars rating={4} /></div>
              <div style={{ marginTop: 8 }}>预计本金请求获得支持。</div>
              <div style={{ marginTop: 6, color: '#6b7280' }}>利息请求需要补强证据。</div>
            </div>

            <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eef2ff' }}>
              <div style={{ fontWeight: 700 }}>收费建议</div>
              <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                <div style={{ padding: 12, borderRadius: 8, border: '1px solid #e6eefc' }}>
                  <div style={{ fontWeight: 700 }}>固定收费</div>
                  <div style={{ marginTop: 6 }}>10000 元</div>
                </div>
                <div style={{ padding: 12, borderRadius: 8, border: '1px solid #e6eefc' }}>
                  <div style={{ fontWeight: 700 }}>风险代理</div>
                  <div style={{ marginTop: 6 }}>10%</div>
                </div>
                <div style={{ padding: 12, borderRadius: 8, border: '1px solid #e6eefc' }}>
                  <div style={{ fontWeight: 700 }}>推荐方案</div>
                  <div style={{ marginTop: 6 }}>固定收费</div>
                </div>
              </div>
            </div>
          </div>

          {/* 下一步行动 - Action Cards */}
          <div style={{ background: 'transparent', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, gridColumn: '1 / -1' }}>
            {['上传身份证', '上传微信聊天', '生成证据目录', '生成起诉状'].map((a) => (
              <div key={a} style={{ background: '#2563eb', color: '#fff', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontWeight: 700 }}>{a}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 6 }}>
            <button
              type="button"
              onClick={() => router.back()}
              style={{ padding: '10px 14px', borderRadius: 8, background: '#fff', border: '1px solid #2563eb', color: '#2563eb' }}
            >
              返回修改
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.setItem('intake_analysis', JSON.stringify(analysis))
                  const draft = JSON.parse(sessionStorage.getItem('intake_draft') || '{}')
                  const payload = {
                    matter_id: `matter-${Date.now()}`,
                    title: analysis.title,
                    description: draft.clientContent || analysis.ai_summary || '',
                    matter_type: analysis.matter_type,
                    analysis,
                  }
                  sessionStorage.setItem('intake_create_payload', JSON.stringify(payload))
                } catch (e) {
                  // ignore storage errors
                }
                router.push('/intake/creating')
              }}
              style={{ padding: '10px 14px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none' }}
            >
              确认接案
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
