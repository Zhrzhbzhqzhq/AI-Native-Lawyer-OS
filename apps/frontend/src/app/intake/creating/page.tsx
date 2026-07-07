"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const steps = [
    '整理案件资料',
    '生成案件摘要',
    '建立时间线',
    '建立证据目录',
    '生成待办事项',
]

export default function CreatingPage() {
    const router = useRouter()
    const [index, setIndex] = useState(0)
    const [done, setDone] = useState(false)

    useEffect(() => {
        if (index >= steps.length) {
            setDone(true)
            return
        }
        const t = setTimeout(() => setIndex((i) => i + 1), 700)
        return () => clearTimeout(t)
    }, [index])

    useEffect(() => {
        if (done) {
            const t = setTimeout(() => {
                router.push('/intake/report')
            }, 300)
            return () => clearTimeout(t)
        }
    }, [done, router])

    return (
        <main style={{ padding: 24 }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <h2 style={{ marginTop: 0 }}>案件整理中</h2>
                <div style={{ color: '#64748b', marginBottom: 12 }}>正在整理案件，请稍候。</div>

                <div style={{ background: '#fff', border: '1px solid #e6e7eb', borderRadius: 8, padding: 16 }}>
                    <ol style={{ margin: 0, paddingLeft: 18 }}>
                        {steps.map((s, i) => (
                            <li key={s} style={{ marginBottom: 10, color: i < index ? '#0f172a' : '#64748b' }}>
                                {i < index ? '✓ ' : ''}{s}
                            </li>
                        ))}
                    </ol>

                    <div style={{ marginTop: 16 }}>
                        {done ? (
                            <div>
                                <div style={{ marginBottom: 12 }}>整理完成。</div>
                                <button onClick={() => router.push('/matters')} style={{ padding: '10px 14px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff' }}>进入案件列表</button>
                            </div>
                        ) : (
                            <div style={{ color: '#64748b' }}>处理中，请稍候…</div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    )
}
