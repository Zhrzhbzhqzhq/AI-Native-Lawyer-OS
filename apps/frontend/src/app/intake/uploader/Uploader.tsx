"use client"

import React, { useCallback, useState } from 'react'

type UploadedFile = { name: string; size: number; type?: string; upload_time: string }

export default function Uploader({ onUploaded }: { onUploaded?: (files: UploadedFile[]) => void }) {
    const [files, setFiles] = useState<File[]>([])
    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState<UploadedFile[]>([])
    const accept = '.pdf,.doc,.docx,image/*,audio/*'

    const handleFiles = useCallback((incoming: FileList | null) => {
        if (!incoming) return
        const arr = Array.from(incoming).filter(Boolean)
        setFiles((f) => f.concat(arr))
    }, [])

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        handleFiles(e.dataTransfer.files)
    }

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const removeAt = (idx: number) => setFiles((f) => f.filter((_, i) => i !== idx))

    async function upload() {
        if (files.length === 0) return
        setUploading(true)
        try {
            const fd = new FormData()
            files.forEach((f) => fd.append('files', f, f.name))

            const res = await fetch('/api/uploads', { method: 'POST', body: fd })
            if (!res.ok) throw new Error('upload failed')
            const json = await res.json()
            // Expect files: [{ name, size, type, upload_time }]
            setUploaded(json.files || [])
            setFiles([])
            if (onUploaded) onUploaded(json.files || [])
        } catch (e) {
            // minimal error handling: keep UI neutral (no red statuses)
            console.error(e)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div style={{ marginTop: 6 }}>
            <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                role="button"
                tabIndex={0}
                style={{ border: '1px dashed #e6e7eb', borderRadius: 8, padding: 18, cursor: 'pointer', background: '#ffffff', color: '#111827' }}
            >
                <div style={{ fontWeight: 600 }}>将文件拖拽到此处或点击选择文件</div>
                <div style={{ marginTop: 6, color: '#6b7280' }}>支持 PDF、Word、图片、音频；可多选</div>
                <div style={{ marginTop: 8 }}>
                    <input
                        type="file"
                        multiple
                        accept={accept}
                        onChange={(e) => handleFiles(e.target.files)}
                        style={{ marginTop: 8 }}
                    />
                </div>
            </div>

            {files.length > 0 && (
                <div style={{ marginTop: 12, border: '1px solid #f1f5f9', borderRadius: 8, background: '#fafafa' }}>
                    <ul style={{ listStyle: 'none', padding: 12, margin: 0 }}>
                        {files.map((f, i) => (
                            <li key={i} style={{ padding: '8px 6px', borderBottom: i < files.length - 1 ? '1px solid #f1f5f9' : 'none', color: '#111827', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 14 }}>{f.name}</div>
                                    <div style={{ fontSize: 12, color: '#6b7280' }}>{(f.size / 1024).toFixed(1)} KB</div>
                                </div>
                                <div>
                                    <button onClick={() => removeAt(i)} style={{ background: 'transparent', border: 'none', color: '#111827', cursor: 'pointer' }}>移除</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div style={{ padding: 12, borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
                        <button onClick={upload} disabled={uploading} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontWeight: 600 }}>{uploading ? '上传中…' : '上传'}</button>
                    </div>
                </div>
            )}

            {uploaded.length > 0 && (
                <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>已上传文件</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {uploaded.map((u, i) => (
                            <li key={i} style={{ padding: '8px 6px', borderBottom: i < uploaded.length - 1 ? '1px solid #f1f5f9' : 'none', color: '#111827', display: 'grid', gridTemplateColumns: '1fr 120px 110px 160px', gap: 8 }}>
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                                <div style={{ color: '#6b7280' }}>{u.type || '-'}</div>
                                <div style={{ color: '#6b7280' }}>{(u.size / 1024).toFixed(1)} KB</div>
                                <div style={{ color: '#6b7280' }}>{new Date(u.upload_time).toLocaleString()}</div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
