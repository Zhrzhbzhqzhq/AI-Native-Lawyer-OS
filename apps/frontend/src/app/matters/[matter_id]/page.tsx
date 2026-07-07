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

  // Mock workspace data for M92
  const mock = {
    title: '张三诉李四民间借贷纠纷',
    priorityStars: 5,
    currentStage: '证据整理',
    aiWorkedMinutes: 42,
    aiConfidence: 82,
    aiTimeline: [
      { t: '09:10', text: 'OCR' },
      { t: '09:12', text: '分类' },
      { t: '09:15', text: 'Proof Map' },
      { t: '09:18', text: '缺口分析' },
      { t: '09:22', text: '等待律师' },
    ],
    workspaces: [
      { key: 'evidence', title: 'Evidence Workspace', status: '等待补证', progress: 42 },
      { key: 'research', title: 'Research Workspace', status: '未开始', progress: 10 },
      { key: 'document', title: 'Document Workspace', status: '未开始', progress: 5 },
      { key: 'execution', title: 'Execution Workspace', status: '未开始', progress: 0 },
    ],
    discoveries: ['借条真实', '微信聊天完整', '缺少银行流水', '建议申请保全'],
    lawyerTodo: ['上传银行流水', '确认诉请', '联系客户', '是否申请保全'],
    confidences: [
      { k: '总体', v: 82 },
      { k: '证据完整度', v: 64 },
      { k: '法律依据', v: 58 },
      { k: '文书准备', v: 30 },
      { k: '起诉可行性', v: 70 },
    ],
    roadmap: ['咨询', '接案', '证据整理', '法律检索', '文书生成', '起诉', '庭审', '执行', '结案'],
  }

  const ProgressBar = ({ value }: { value: number }) => (
    <div style={{ background: '#e6eef6', borderRadius: 8, height: 10, width: '100%' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: tokens.blue, borderRadius: 8 }} />
    </div>
  )

  // Simplified, monochrome Matter Home focused on "What should I do now"
  const clientName = '张三'
  const status = '进行中'

  return (
    <main style={{ padding: 32, background: '#ffffff', color: '#0f172a', minHeight: '80vh' }}>
      {/* Top: 案件概况 */}
      <section style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{mock.title}</div>
            <div style={{ marginTop: 6, color: '#6b7280' }}>委托人：{clientName}</div>
          </div>
          <div style={{ textAlign: 'right', color: '#6b7280' }}>
            <div>当前阶段：<span style={{ fontWeight: 700, color: '#111827' }}>{mock.currentStage}</span></div>
            <div style={{ marginTop: 6 }}>案件状态：<span style={{ fontWeight: 700 }}>{status}</span></div>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        {/* 主区域：AI 今天建议（固定 mock 文案） */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #e6e7eb', padding: 20, borderRadius: 12, minHeight: 220 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>AI 今天建议</div>
            <div style={{ color: '#374151', lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>今天建议完成：</div>
              <ol style={{ marginLeft: 18 }}>
                <li>上传银行流水</li>
                <li>上传微信聊天记录</li>
                <li>整理借款时间线</li>
              </ol>

              <div style={{ marginTop: 12, fontWeight: 700 }}>预计耗时：</div>
              <div style={{ marginTop: 6 }}>25 分钟</div>
            </div>
          </div>
        </div>

        {/* 侧栏：当前资料 + 下一步 */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #e6e7eb', padding: 16, borderRadius: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>当前资料</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#374151' }}>
              <li style={{ marginBottom: 8 }}>✓ 客户信息</li>
              <li style={{ marginBottom: 8 }}>✓ 委托合同</li>
              <li style={{ marginBottom: 8 }}>□ 银行流水</li>
              <li style={{ marginBottom: 8 }}>□ 微信聊天</li>
              <li style={{ marginBottom: 8 }}>□ 借条</li>
              <li style={{ marginBottom: 8 }}>□ 录音</li>
            </ul>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e6e7eb', padding: 16, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 800 }}>下一步</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => router.push(`/matters/${params.matter_id}/documents`)} style={{ background: tokens.blue, color: '#fff', border: 'none', padding: '10px 14px', borderRadius: 8, fontWeight: 700 }}>上传资料</button>
              <button onClick={() => router.push(`/matters/${params.matter_id}/research`)} style={{ background: '#fff', color: '#111827', border: `1px solid #d1d5db`, padding: '10px 14px', borderRadius: 8 }}>法律检索</button>
              <button onClick={() => router.push(`/matters/${params.matter_id}/documents`)} style={{ background: '#fff', color: '#111827', border: `1px solid #d1d5db`, padding: '10px 14px', borderRadius: 8 }}>生成文书</button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
