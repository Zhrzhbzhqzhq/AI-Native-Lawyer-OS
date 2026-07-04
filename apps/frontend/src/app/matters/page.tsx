"use client"
import React, { useEffect, useState, useRef } from 'react'

type Matter = {
  id: string
  matter_id: string
  title: string
  description: string
  status: string
  updated_at?: string
  created_at?: string
  matter_type?: string
}

const API = (path = '') => `http://localhost:4000${path}`

export default function MattersPage() {
  const [matters, setMatters] = useState<Matter[]>([])
  const [loading, setLoading] = useState(false)
  const [matterId, setMatterId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [matterType, setMatterType] = useState('')
  const matterIdRef = useRef<HTMLInputElement | null>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)
  const descriptionRef = useRef<HTMLInputElement | null>(null)
  const matterTypeRef = useRef<HTMLInputElement | null>(null)
  const [filter, setFilter] = useState<'all'|'active'|'closed'|'archived'>('all')

  async function fetchMatters() {
    setLoading(true)
    try {
      const res = await fetch(API('/matters'))
      const data = await res.json()
      // Normalize response: accept either an array or an object { matters: [...] }
      let list: any[] = []
      if (Array.isArray(data)) list = data
      else if (data && Array.isArray((data as any).matters)) list = (data as any).matters
      else list = []
      setMatters(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMatters() }, [])

  async function handleCreate(e?: React.FormEvent) {
    if (e && e.preventDefault) e.preventDefault()
    const mId = (matterIdRef.current?.value ?? '').trim()
    const ttl = (titleRef.current?.value ?? '').trim()
    const desc = (descriptionRef.current?.value ?? '').trim()
    const mType = (matterTypeRef.current?.value ?? '').trim()
    if (!mId || !ttl) {
      console.warn('handleCreate: validation failed - matter_id and title are required', { matterId: mId, title: ttl })
      return
    }
    const payload = { matter_id: mId, title: ttl, description: desc, matter_type: mType }
    console.log('handleCreate: sending', payload)
    try {
      const res = await fetch(API('/matters'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      let data = null
      try { data = await res.json() } catch (jsonErr) { console.warn('handleCreate: no json body', jsonErr) }
      console.log('handleCreate: response', res.status, data)
      if (!res.ok) {
        console.error('handleCreate: create failed', res.status, data)
        return
      }
      // clear uncontrolled inputs
      if (matterIdRef.current) matterIdRef.current.value = ''
      if (titleRef.current) titleRef.current.value = ''
      if (descriptionRef.current) descriptionRef.current.value = ''
      if (matterTypeRef.current) matterTypeRef.current.value = ''
      fetchMatters()
    } catch (err) {
      console.error('handleCreate: exception', err)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(API(`/matters/${id}`), { method: 'DELETE' })
      fetchMatters()
    } catch (err) { console.error(err) }
  }

  const filtered = matters.filter(m => {
    if (filter === 'all') return true
    if (filter === 'active') return m.status === 'active'
    if (filter === 'closed') return m.status === 'closed'
    if (filter === 'archived') return m.status === 'archived'
    return true
  })

  return (
    <main style={{ padding: 24 }}>
      <h1>Matters Workspace</h1>

      <section style={{ marginBottom: 16 }}>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="matter_id" ref={matterIdRef} defaultValue={matterId} />
          <input placeholder="title" ref={titleRef} defaultValue={title} />
          <input placeholder="description" ref={descriptionRef} defaultValue={description} />
          <input placeholder="matter_type" ref={matterTypeRef} defaultValue={matterType} />
          <button type="button" onClick={() => handleCreate()}>Create</button>
          <button type="button" onClick={() => fetchMatters()}>Refresh</button>
        </form>
      </section>

      <section style={{ marginBottom: 12 }}>
        <strong>Filter:</strong>{' '}
        <button onClick={() => setFilter('all')}>All</button>{' '}
        <button onClick={() => setFilter('active')}>Active</button>{' '}
        <button onClick={() => setFilter('closed')}>Closed</button>{' '}
        <button onClick={() => setFilter('archived')}>Archived</button>
      </section>

      {loading ? <div>Loading...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Matter ID</th>
              <th style={{ textAlign: 'left' }}>Title</th>
              <th style={{ textAlign: 'left' }}>Status</th>
              <th style={{ textAlign: 'left' }}>Updated At</th>
              <th style={{ textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.matter_id} style={{ borderTop: '1px solid #eee' }}>
                <td>{m.matter_id}</td>
                <td>{m.title}</td>
                <td>{m.status}</td>
                <td>{m.updated_at ?? m.created_at ?? ''}</td>
                <td>
                  <a href={`/matters/${encodeURIComponent(m.matter_id)}`}>Open</a>{' '}
                  <button onClick={() => handleDelete(m.matter_id)} style={{ marginLeft: 8 }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
