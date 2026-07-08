"use client"
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const theme = {
  pageBg: '#f4f7fb',
  cardBg: '#ffffff',
  border: '#e6eef6',
  text: '#0f172a',
  muted: '#64748b',
  blue: '#2563eb',
}

export default function MatterLayout({ children, params }: { children: React.ReactNode; params: { matter_id: string } }) {
  const pathname = usePathname() || ''
  const base = `/matters/${params.matter_id}`
  const matterListHref = '/matters'
  const matterListActive = pathname === matterListHref || pathname === `${matterListHref}/`
  const matterId = String(params.matter_id || '')
  const [matterName, setMatterName] = React.useState<string>(`Matter #${matterId}`)

  React.useEffect(() => {
    let mounted = true
    const API = (process.env.NEXT_PUBLIC_API_BASE_URL as string) || 'http://localhost:4000'
    async function load() {
      try {
        const res = await fetch(`${API}/matters/${encodeURIComponent(matterId)}`)
        if (!mounted) return
        if (!res.ok) return
        const j = await res.json().catch(() => null)
        if (!mounted) return
        if (j && j.title) setMatterName(j.title)
      } catch (e) {
        // ignore - keep Matter #id
      }
    }
    if (matterId) load()
    return () => { mounted = false }
  }, [matterId])

  const caseType = '未分类案件'
  const currentStage = '证据准备'
  const shortMatterId = matterId.length > 12 ? `...${matterId.slice(-9)}` : matterId

  const items = [
    { key: 'overview', zh: '案件概览', en: 'Matter Overview', href: `${base}` },
    { key: 'evidence', zh: '证据工作区', en: 'Evidence Workspace', href: `${base}/evidence` },
    { key: 'research', zh: '法律检索', en: 'Legal Research', href: `${base}/research` },
    { key: 'documents', zh: '文书工作区', en: 'Document Workspace', href: `${base}/documents` },
    { key: 'execution', zh: '执行工作区', en: 'Execution Workspace', href: `${base}/execution` },
    // Note: Runtime entry hidden in V1 showcase to avoid exposing AI runtime page
  ]

  return (
    <div style={{ background: theme.pageBg, minHeight: '100vh' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: theme.cardBg, borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link
            href={matterListHref}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              textDecoration: 'none',
              color: matterListActive ? '#fff' : theme.text,
              background: matterListActive ? theme.blue : 'transparent',
              border: matterListActive ? 'none' : `1px solid ${theme.border}`,
              lineHeight: 1.05,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700 }}>案件列表</div>
            <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2, color: matterListActive ? 'rgba(255,255,255,0.9)' : theme.muted }}>Matter List</div>
          </Link>
          <div style={{ marginRight: 12, lineHeight: 1.05 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>案件导航</div>
            <div style={{ fontSize: 9, fontWeight: 400, color: theme.muted, marginTop: 2 }}>Matter Navigation</div>
          </div>
          <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {items.map((it) => {
              const active = pathname === it.href || pathname === it.href + '/' || (it.href === `${base}` && pathname === `${base}`)
              return (
                <Link key={it.key} href={it.href} style={{ padding: '8px 12px', borderRadius: 8, textDecoration: 'none', color: active ? '#fff' : theme.text, background: active ? theme.blue : 'transparent', border: active ? 'none' : `1px solid ${theme.border}`, lineHeight: 1.05 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{it.zh}</div>
                  <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2, color: active ? 'rgba(255,255,255,0.9)' : theme.muted }}>{it.en}</div>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Compact Matter Bar */}
        <div style={{ padding: '8px 20px', borderTop: `1px solid ${theme.border}`, height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: theme.text, lineHeight: '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{matterName}</div>
            <div style={{ marginTop: 2, fontSize: 12, color: theme.muted, lineHeight: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {caseType} ｜ {currentStage} ｜ Matter #{shortMatterId} ｜ <span style={{ color: theme.blue, fontWeight: 700 }}>AI 工作中</span>
            </div>
          </div>
          <div style={{ marginLeft: 8 }}>
            {/* small status or actions could go here later */}
          </div>
        </div>
      </div>

      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}
