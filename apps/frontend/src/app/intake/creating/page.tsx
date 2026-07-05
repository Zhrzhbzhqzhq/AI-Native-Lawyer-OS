"use client"

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'

export default function CreatingPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState<number>(-1)
  const [countdown, setCountdown] = useState<number>(8)
  const [postStatus, setPostStatusState] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle')
  const postStatusRef = useRef<typeof postStatus>('idle')
  const steps = [
    '创建 Matter',
    '创建 Workspace',
    '创建 Runtime',
    '创建 Evidence',
    '创建 Documents',
    "创建 Today's Queue",
    'AI Chief 制定今日计划',
  ]

  const timerRef = useRef<number | null>(null)
  const stepIntervalRef = useRef<number | null>(null)
  const matterIdRef = useRef<string | null>(null)
  const stepIndexRef = useRef<number>(0)

  const setPostStatus = (v: typeof postStatus) => {
    postStatusRef.current = v
    setPostStatusState(v)
  }

  const appendLog = (text: string) => {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const entry = `[${hh}:${mm}:${ss}] ${text}`
    setLogs((l) => [...l, entry])
  }

  const clearTimers = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (stepIntervalRef.current) {
      window.clearInterval(stepIntervalRef.current)
      stepIntervalRef.current = null
    }
  }

  const attemptCreate = async (isRetry = false) => {
    try {
      const payload = JSON.parse(sessionStorage.getItem('intake_create_payload') || '{}')
      if (!payload || !payload.title) {
        appendLog('无效的创建载荷，停止。')
        setPostStatus('failed')
        return
      }

      if (isRetry) appendLog('开始重新创建 Matter...')
      else appendLog('开始创建 Matter...')

      setPostStatus('pending')

      const res = await fetch(`${API}/matters`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) {
        const body = await res.json().catch(() => ({}))
        const matterId = body.matter_id || payload.matter_id || `matter-${Date.now()}`
        matterIdRef.current = matterId
        appendLog('Matter 创建成功。')
        setPostStatus('success')
      } else {
        appendLog('Matter 创建失败。')
        appendLog('等待重新创建。')
        setPostStatus('failed')
        // stop countdown
        if (timerRef.current) {
          window.clearInterval(timerRef.current)
          timerRef.current = null
        }
        // stay at step 0
        setCurrentStep(0)
        stepIndexRef.current = 0
      }
    } catch (e) {
      appendLog('Matter 创建失败。')
      appendLog('等待重新创建。')
      setPostStatus('failed')
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
      setCurrentStep(0)
      stepIndexRef.current = 0
    }
  }

  useEffect(() => {
    // initialize UI immediately
    setCurrentStep(0)
    stepIndexRef.current = 0
    appendLog('开始创建 Matter...')
    setPostStatus('pending')

    // countdown
    timerRef.current = window.setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)

    // step progression interval: only advances when postStatusRef.current === 'success'
    stepIntervalRef.current = window.setInterval(() => {
      if (postStatusRef.current === 'success') {
        stepIndexRef.current += 1
        const idx = stepIndexRef.current
        if (idx < steps.length) {
          setCurrentStep(idx)
          appendLog(steps[idx])
        } else if (idx === steps.length) {
          appendLog('初始化完成')
        } else {
          // finish
          clearTimers()
          setTimeout(() => {
            const id = matterIdRef.current
            if (id) router.push(`/matters/${id}`)
          }, 600)
        }
      }
    }, 1000)

    // attempt create once
    attemptCreate(false)

    return () => {
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // retry handler from UI
  const handleRetry = () => {
    // clear logs? keep logs and append messages
    appendLog('用户触发：重新创建')
    setCountdown(8)
    // restart countdown
    if (!timerRef.current) {
      timerRef.current = window.setInterval(() => {
        setCountdown((c) => (c > 0 ? c - 1 : 0))
      }, 1000)
    }
    // reset step index to 0 and status
    setCurrentStep(0)
    stepIndexRef.current = 0
    attemptCreate(true)
  }

  return (
    <main>
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
        <h2>AI 正在创建案件工作区</h2>
        <div style={{ color: '#6b7280', marginTop: 6 }}>LawDesk AI 正在初始化案件……</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
          {/* 左侧：AI 工作流 */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eef2ff' }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>AI 工作流</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {steps.map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i <= currentStep ? '#2563eb' : '#eef2ff', color: i <= currentStep ? '#fff' : '#6b7280', transition: 'background 300ms' }}>
                    {i <= currentStep ? '✓' : '○'}
                  </div>
                  <div style={{ fontWeight: 600 }}>{s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：AI 实时日志 */}
          <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eef2ff', height: 300, overflow: 'auto' }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>AI 实时日志</div>
            <div style={{ fontSize: 13, color: '#374151' }}>
              {logs.map((l, idx) => (
                <div key={idx} style={{ marginBottom: 6 }}>{l}</div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #eef2ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>正在初始化案件……</div>
          <div style={{ textAlign: 'right' }}>
            <div>预计剩余 {countdown} 秒</div>
          </div>
        </div>

        {postStatus === 'failed' && (
          <div style={{ marginTop: 16, background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #fde2e2' }}>
            <div style={{ fontWeight: 700, color: '#b91c1c' }}>AI 创建失败</div>
            <div style={{ marginTop: 8 }}>LawDesk 无法创建案件工作区。</div>
            <div style={{ marginTop: 8 }}>可能原因：</div>
            <ul style={{ marginTop: 6 }}>
              <li>• Matter 服务未启动</li>
              <li>• 网络异常</li>
              <li>• 后端创建失败</li>
            </ul>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={handleRetry} style={{ padding: '8px 12px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none' }}>重新创建</button>
              <button onClick={() => router.push('/intake/report')} style={{ padding: '8px 12px', borderRadius: 8, background: '#fff', border: '1px solid #cbd5e1' }}>返回接案报告</button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
