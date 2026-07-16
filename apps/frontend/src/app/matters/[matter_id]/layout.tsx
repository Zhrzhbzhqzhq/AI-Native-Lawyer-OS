"use client"
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { apiUrl } from '../../../lib/api'

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
  const matterBasePath = `/matters/${params.matter_id}`
  const matterListHref = '/matters'
  const matterListActive = pathname === matterListHref || pathname === `${matterListHref}/`
  const matterId = String(params.matter_id || '')
  const [matterName, setMatterName] = React.useState<string>('')
  const [matterType, setMatterType] = React.useState<string>('')
  const [matterStatus, setMatterStatus] = React.useState<string>('')
  const [matterError, setMatterError] = React.useState<string | null>(null)

  const loadMatter = React.useCallback(async () => {
    setMatterError(null)
    try {
      const res = await fetch(apiUrl(`/matters/${encodeURIComponent(matterId)}`))
      if (!res.ok) throw new Error('request_failed')
      const j = await res.json().catch(() => { throw new Error('invalid_response') })
      if (!j || typeof j !== 'object' || Array.isArray(j) || typeof j.matter_id !== 'string' || typeof j.title !== 'string') throw new Error('invalid_response')
      setMatterName(j.title)
      setMatterType(typeof j.matter_type === 'string' ? j.matter_type : '')
      setMatterStatus(typeof j.status === 'string' ? j.status : '')
    } catch (error: any) {
      setMatterName('')
      setMatterType('')
      setMatterStatus('')
      setMatterError(error?.message === 'invalid_response' ? '案件信息返回数据暂不可用' : '案件信息加载失败')
    }
  }, [matterId])

  React.useEffect(() => {
    let mounted = true
    if (matterId && mounted) loadMatter()
    return () => { mounted = false }
  }, [matterId, loadMatter])

  const shortMatterId = matterId.length > 12 ? `...${matterId.slice(-9)}` : matterId

  const items = [
    { key: 'overview', zh: '案件概览', en: 'Matter Overview', href: matterBasePath },
    { key: 'evidence', zh: '证据工作区', en: 'Evidence Workspace', href: `${matterBasePath}/evidence` },
    { key: 'research', zh: '法律检索', en: 'Legal Research', href: `${matterBasePath}/research` },
    { key: 'documents', zh: '文书工作区', en: 'Document Workspace', href: `${matterBasePath}/documents` },
    { key: 'execution', zh: '执行工作区', en: 'Execution Workspace', href: `${matterBasePath}/execution` },
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
              const active = pathname === it.href || pathname === it.href + '/' || (it.href === matterBasePath && pathname === matterBasePath)
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
            <div style={{ fontSize: 16, fontWeight: 800, color: matterError ? '#b91c1c' : theme.text, lineHeight: '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{matterError || matterName}</div>
            <div style={{ marginTop: 2, fontSize: 12, color: theme.muted, lineHeight: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {matterError ? <button onClick={loadMatter}>重新加载</button> : [matterType, matterStatus, `Matter #${shortMatterId}`].filter(Boolean).join(' ｜ ')}
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
