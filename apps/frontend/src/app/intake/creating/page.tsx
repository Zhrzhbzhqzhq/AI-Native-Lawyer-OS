
"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'

export default function CreatingPage() {
  const router = useRouter()
  const [status, setStatus] = useState({ matter: 'pending', workspace: 'pending', runtime: 'pending', timeline: 'pending', documents: 'pending' })
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function createMatter() {
    setError(null)
    setCreating(true)
    try {
      const payload = JSON.parse(sessionStorage.getItem('intake_create_payload') || '{}')
      if (!payload || !payload.matter_id || !payload.title) throw new Error('invalid payload')

      // call existing API
      const res = await fetch(`${API}/matters`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(t || 'create failed')
      }
      const body = await res.json()

      // mark steps as completed
      setStatus({ matter: 'done', workspace: 'pending', runtime: 'pending', timeline: 'pending', documents: 'pending' })

      // simulate subsequent steps quickly
      await new Promise((r) => setTimeout(r, 400))
      setStatus((s) => ({ ...s, workspace: 'done' }))
      await new Promise((r) => setTimeout(r, 300))
      setStatus((s) => ({ ...s, runtime: 'done' }))
      await new Promise((r) => setTimeout(r, 300))
      setStatus((s) => ({ ...s, timeline: 'done' }))
      await new Promise((r) => setTimeout(r, 300))
      setStatus((s) => ({ ...s, documents: 'done' }))

      // navigate to matter workspace
      const matter_id = body.matter_id || payload.matter_id
      router.push(`/matters/${matter_id}`)
    } catch (e: any) {
      setError(e?.message || '创建案件失败')
      setStatus({ matter: 'failed', workspace: 'pending', runtime: 'pending', timeline: 'pending', documents: 'pending' })
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    createMatter()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main>
      <section style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
        <h2>正在创建案件</h2>
        <div style={{ marginTop: 20, background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #eef2ff' }}>
          <div style={{ padding: '8px 0' }}>{status.matter === 'done' ? '✓' : status.matter === 'failed' ? '✕' : '○'} 创建 Matter</div>
          <div style={{ padding: '8px 0' }}>{status.workspace === 'done' ? '✓' : '○'} 创建 Workspace</div>
          <div style={{ padding: '8px 0' }}>{status.runtime === 'done' ? '✓' : '○'} 创建 Runtime</div>
          <div style={{ padding: '8px 0' }}>{status.timeline === 'done' ? '✓' : '○'} 创建 Timeline</div>
          <div style={{ padding: '8px 0' }}>{status.documents === 'done' ? '✓' : '○'} 创建 Documents</div>
        </div>

        {error && (
          <div style={{ marginTop: 16, color: '#b91c1c' }}>
            <div>创建案件失败：{error}</div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={() => createMatter()} style={{ padding: '8px 12px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none' }}>重新创建</button>
              <button onClick={() => router.push('/intake/report')} style={{ padding: '8px 12px', borderRadius: 8, background: '#fff', border: '1px solid #cbd5e1' }}>返回分析报告</button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
