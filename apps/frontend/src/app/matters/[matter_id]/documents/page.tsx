"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const tokens = {
  pageBg: '#ffffff',
  cardBg: '#fafafa',
  border: '#e6e6e6',
  text: '#0f172a',
  muted: '#6b7280',
  radius: 8,
}

export default function DocumentsWorkspace() {
  const params = useParams() as { matter_id?: string }
  const matterId = params?.matter_id || ''

  // Left: Arguments
  const [argumentsList, setArgumentsList] = useState<any[]>([])
  const [loadingArgs, setLoadingArgs] = useState<boolean>(true)
  const [issueQuery, setIssueQuery] = useState<string>('')
  const [selectedArgId, setSelectedArgId] = useState<string | null>(null)

  // Right: Documents
  const [documents, setDocuments] = useState<any[]>([])
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)

  // Create / Edit dialog state
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newStatus, setNewStatus] = useState('draft')
  const [creating, setCreating] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingPatch, setEditingPatch] = useState<any>({})
  const [savingEdit, setSavingEdit] = useState(false)
  // AI suggestions state
  const [suggestions, setSuggestions] = useState<Array<{ id?: string; title: string; document_type?: string; content?: string }>>([])
  const [analyzing, setAnalyzing] = useState<boolean>(false)

  const base = (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:4000'

  async function fetchArguments() {
    setLoadingArgs(true)
    try {
      const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/arguments`)
      if (!res.ok) throw new Error('加载议题失败')
      const json = await res.json()
      setArgumentsList(Array.isArray(json) ? json : [])
    } catch (e) {
      setArgumentsList([])
    } finally {
      setLoadingArgs(false)
    }
  }

  async function fetchDocuments() {
    setLoadingDocs(true)
    try {
      const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/documents`)
      if (!res.ok) throw new Error('加载文书失败')
      const json = await res.json()
      const arr = Array.isArray(json) ? json : []
      setDocuments(arr)
      // default-select first document when present
      if (arr.length > 0) {
        const firstId = arr[0].document_id ?? arr[0].id ?? null
        if (firstId) openDoc(firstId)
      } else {
        setSelectedDocId(null)
      }
    } catch (e) {
      setDocuments([])
    } finally {
      setLoadingDocs(false)
    }
  }

  // computed selected document object (may be null)
  // support APIs that return either `document_id` or `id` as the primary identifier
  const selectedDocument = documents.find((d: any) => ((d.document_id ?? d.id) === selectedDocId)) || null

  useEffect(() => {
    if (!matterId) return
    fetchArguments()
    fetchDocuments()
  }, [matterId])

  const filteredArgs = argumentsList.filter((it) => String(it.title || '').toLowerCase().includes(issueQuery.trim().toLowerCase()))

  function openDoc(docId: string) {
    setSelectedDocId(docId)
    setEditingId(null)
    setEditingPatch({})
  }

  function startEdit(doc: any) {
    const id = doc?.document_id ?? doc?.id
    setEditingId(id)
    setEditingPatch({ title: doc?.title || '', document_type: doc?.document_type || '', content: doc?.content || '', status: doc?.status || 'draft' })
  }

  async function saveEdit(docId: string) {
    setSavingEdit(true)
    try {
      const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/documents/${encodeURIComponent(docId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingPatch) })
      if (!res.ok) { const txt = await res.text().catch(() => ''); throw new Error(`保存失败 ${res.status} ${txt}`) }
      await fetchDocuments()
      setEditingId(null)
      if (selectedDocId === docId) openDoc(docId)
    } catch (e: any) {
      console.error(e)
    } finally {
      setSavingEdit(false)
    }
  }

  async function deleteDoc(docId: string) {
    try {
      const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/documents/${encodeURIComponent(docId)}`, { method: 'DELETE' })
      if (!res.ok) { const txt = await res.text().catch(() => ''); throw new Error(`删除失败 ${res.status} ${txt}`) }
      await fetchDocuments()
      if (selectedDocId === docId) setSelectedDocId(null)
    } catch (e: any) {
      console.error(e)
    }
  }

  async function createDocument() {
    if (!newTitle || newTitle.trim().length === 0) return
    setCreating(true)
    try {
      const payload: any = { title: newTitle.trim(), document_type: newType || '', content: newContent || '', status: newStatus || 'draft' }
      const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { const txt = await res.text().catch(() => ''); throw new Error(`创建失败 ${res.status} ${txt}`) }
      await fetchDocuments()
      setShowCreate(false)
      setNewTitle(''); setNewType(''); setNewContent(''); setNewStatus('draft')
    } catch (e: any) {
      console.error(e)
    } finally { setCreating(false) }
  }

  return (
    <div style={{ padding: 16, background: tokens.pageBg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Left: Arguments list */}
          <div style={{ flex: 1 }}>
            <div style={{ background: tokens.cardBg, padding: 12, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800 }}>论点（Arguments）</div>
                <div style={{ color: tokens.muted }}>{loadingArgs ? '加载中…' : `${argumentsList.length} 条`}</div>
              </div>

              <div style={{ marginTop: 8 }}>
                <input placeholder="搜索论点" value={issueQuery} onChange={(e) => setIssueQuery(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6' }} />
              </div>

              <div style={{ marginTop: 12 }}>
                {loadingArgs ? <div style={{ color: tokens.muted }}>加载论点中…</div> : filteredArgs.length === 0 ? <div style={{ color: tokens.muted }}>暂无论点</div> : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {filteredArgs.map((it: any) => {
                      const isSel = selectedArgId === it.argument_id
                      return (
                        <li key={it.argument_id} onClick={() => setSelectedArgId((s) => s === it.argument_id ? null : it.argument_id)} style={{ padding: 8, borderBottom: '1px solid #f1f1f1', cursor: 'pointer', background: isSel ? '#f3f4f6' : 'transparent', borderLeft: isSel ? '3px solid #111' : '3px solid transparent' }}>
                          <div style={{ fontWeight: 700 }}>{it.title}</div>
                          <div style={{ color: tokens.muted, fontSize: 12 }}>{it.status || 'draft'}</div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Right: Documents CRUD */}
          <div style={{ width: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 800 }}>文书（Documents）</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowCreate(true)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e6e7ef', background: '#fff', fontWeight: 700 }}>新建文书</button>
                <button disabled={analyzing} onClick={async () => {
                  setAnalyzing(true)
                  try {
                    const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/documents/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
                    if (!res.ok) throw new Error(`status:${res.status}`)
                    const json = await res.json()
                    const s = Array.isArray(json) ? json.map((it: any, i: number) => ({ id: it.id || `s-${i}`, title: String(it.title || ''), document_type: String(it.document_type || ''), content: String(it.content || '') })) : []
                    setSuggestions(s)
                  } catch (e) {
                    console.error('documents analyze failed', e)
                    setSuggestions([])
                  } finally {
                    setAnalyzing(false)
                  }
                }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e6e7ef', background: '#fff', fontWeight: 700 }}>{analyzing ? 'AI 正在生成文书初稿……' : 'AI 生成文书初稿'}</button>
              </div>
            </div>

            <div style={{ background: tokens.cardBg, padding: 12, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
              {loadingDocs ? (
                <div style={{ color: tokens.muted }}>加载文书中…</div>
              ) : documents.length === 0 ? (
                <div style={{ color: tokens.muted }}>暂无文书草稿</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {documents.map((doc: any) => {
                    const docId = doc?.document_id ?? doc?.id ?? null
                    return (
                      <li key={docId ?? Math.random()} style={{ padding: 10, borderBottom: '1px solid #f3f3f3' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ cursor: 'pointer' }} onClick={() => docId && openDoc(docId)}>
                            <div style={{ fontWeight: 700 }}>{doc?.title ?? '(无标题)'}</div>
                            <div style={{ color: tokens.muted, fontSize: 12 }}>{doc?.document_type ?? ''} · {doc?.status ?? 'draft'}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => startEdit(doc)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e6eef6', background: '#fff', fontSize: 12 }}>编辑</button>
                            <button onClick={() => docId && deleteDoc(docId)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fff', color: '#b91c1c', fontSize: 12 }}>删除</button>
                          </div>
                        </div>

                        {selectedDocId === docId ? (
                          <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: '#fff' }}>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>{selectedDocument?.title ?? '(无标题)'}</div>
                            <div style={{ color: tokens.muted, marginBottom: 8 }}>类型：{selectedDocument?.document_type ?? '—'}</div>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>正文</div>
                            <div style={{ color: tokens.muted, whiteSpace: 'pre-wrap' }}>{selectedDocument?.content ?? selectedDocument?.content_uri ?? '—'}</div>
                            <div style={{ marginTop: 8, fontWeight: 700 }}>状态</div>
                            <div style={{ color: tokens.muted }}>{selectedDocument?.status ?? 'draft'}</div>
                            <div style={{ marginTop: 8, color: tokens.muted, fontSize: 12 }}>{selectedDocument?.created_at ? `创建: ${new Date(selectedDocument.created_at).toLocaleString()}` : ''}{selectedDocument?.updated_at ? ` • 更新: ${new Date(selectedDocument.updated_at).toLocaleString()}` : ''}</div>
                          </div>
                        ) : null}

                        {editingId === docId ? (
                          <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: '#fff' }}>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>编辑文书</div>
                            <div style={{ marginBottom: 8 }}>
                              <input value={editingPatch.title || ''} onChange={(e) => setEditingPatch((p: any) => ({ ...p, title: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6' }} />
                            </div>
                            <div style={{ marginBottom: 8 }}>
                              <input value={editingPatch.document_type || ''} onChange={(e) => setEditingPatch((p: any) => ({ ...p, document_type: e.target.value }))} placeholder="类型" style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6' }} />
                            </div>
                            <div style={{ marginBottom: 8 }}>
                              <textarea value={editingPatch.content || ''} onChange={(e) => setEditingPatch((p: any) => ({ ...p, content: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6', minHeight: 120 }} />
                            </div>
                            <div style={{ marginBottom: 8 }}>
                              <select value={editingPatch.status || 'draft'} onChange={(e) => setEditingPatch((p: any) => ({ ...p, status: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6' }}>
                                <option value="draft">draft</option>
                                <option value="completed">completed</option>
                                <option value="need_review">need_review</option>
                                <option value="archived">archived</option>
                              </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                              <button onClick={() => setEditingId(null)} style={{ padding: '6px 10px', borderRadius: 6 }}>取消</button>
                              <button onClick={() => docId && saveEdit(docId)} disabled={savingEdit} style={{ padding: '6px 10px', borderRadius: 6, background: '#111', color: '#fff' }}>{savingEdit ? '保存中…' : '保存'}</button>
                            </div>
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Create dialog */}
        {showCreate ? (
          <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 560, background: '#fff', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800 }}>新建文书</div>
                <div><button onClick={() => { setShowCreate(false) }} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>关闭</button></div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>标题</div>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6' }} />
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>类型（可选）</div>
                <input value={newType} onChange={(e) => setNewType(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6' }} />
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>正文</div>
                <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6', minHeight: 160 }} />
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>状态</div>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e6eef6' }}>
                  <option value="draft">draft</option>
                  <option value="completed">completed</option>
                  <option value="need_review">need_review</option>
                  <option value="archived">archived</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button onClick={() => { setShowCreate(false) }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e7eb', background: '#fff' }}>取消</button>
                <button onClick={() => createDocument()} disabled={creating} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#111', color: '#fff' }}>{creating ? '保存中…' : '保存'}</button>
              </div>
            </div>
          </div>
        ) : null}

        {/* AI Suggestions area */}
        <div style={{ maxWidth: 1200, margin: '12px auto 0', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 520, background: '#fff', borderRadius: tokens.radius, padding: 12, border: `1px solid ${tokens.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>AI 建议</div>
              {suggestions && suggestions.length > 0 ? (
                <button onClick={async () => {
                  for (const s of suggestions.slice()) {
                    try {
                      const body: any = { title: s.title, document_type: s.document_type || '', content: s.content || '' }
                      if (selectedArgId) body.argument_id = selectedArgId
                      const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                      if (!res.ok) throw new Error(`status:${res.status}`)
                    } catch (e) {
                      console.error('accept all documents failed', e)
                    }
                  }
                  try { await fetchDocuments() } catch (e) { }
                  setSuggestions([])
                }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e6e7ef', background: '#fff', fontWeight: 700 }}>全部接受</button>
              ) : null}
            </div>

            {suggestions && suggestions.length > 0 ? (
              <div style={{ marginTop: 10 }}>
                {suggestions.map((s) => (
                  <div key={s.id} style={{ padding: 10, borderRadius: 8, marginBottom: 8, background: '#fff', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{s.title}</div>
                        <div style={{ color: tokens.muted, marginTop: 6 }}>类型：{s.document_type || '—'}</div>
                        <div style={{ fontWeight: 700, marginTop: 8 }}>正文</div>
                        <div style={{ color: tokens.muted, marginTop: 6, whiteSpace: 'pre-wrap' }}>{s.content}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                        <button onClick={async () => {
                          try {
                            const body: any = { title: s.title, document_type: s.document_type || '', content: s.content || '' }
                            if (selectedArgId) body.argument_id = selectedArgId
                            const res = await fetch(`${base}/matters/${encodeURIComponent(matterId)}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                            if (!res.ok) throw new Error(`status:${res.status}`)
                            setSuggestions((prev) => prev.filter((x) => x.id !== s.id))
                            try { await fetchDocuments() } catch (e) { }
                          } catch (e) {
                            console.error('accept document failed', e)
                            alert('创建文书失败，请稍后重试')
                          }
                        }} style={{ padding: '6px 10px', borderRadius: 6, background: '#111827', color: '#fff', border: 'none' }}>接受</button>

                        <button onClick={() => setSuggestions((prev) => prev.filter((x) => x.id !== s.id))} style={{ padding: '6px 10px', borderRadius: 6, background: '#fff', color: '#111827', border: '1px solid #e6e7ef' }}>忽略</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 10, color: tokens.muted }}>AI 建议将显示在此处</div>
            )}
          </div>
        </div>
        {/* 办案主流程已完成 区域（不跳转） */}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 720, maxWidth: '90%', padding: 16, borderRadius: 10, background: '#f3f4f6', color: '#111827', textAlign: 'center', fontWeight: 800 }}>办案主流程已完成</div>
        </div>
      </div>
    </div>
  )
}
