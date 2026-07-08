"use client"
import React, { useState } from 'react'

export default function AIHealthPage() {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    async function runCheck() {
        setLoading(true)
        setError(null)
        setResult(null)
        try {
            const res = await fetch('/ai/health-check', { method: 'POST' })
            const json = await res.json()
            setResult(json)
        } catch (e: any) {
            setError(e?.message || String(e))
        } finally {
            setLoading(false)
        }
    }

    return (
        <main style={{ padding: 24, fontFamily: 'Inter, system-ui, sans-serif', color: '#111' }}>
            <h1 style={{ marginBottom: 8 }}>AI 健康检查</h1>
            <p style={{ color: '#666', marginTop: 0 }}>开发工具 — 测试 MiniMax 接入状态（不会暴露 API Key）</p>

            <div style={{ display: 'grid', gap: 8, maxWidth: 720, marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <strong>Provider:</strong>
                    <span>{process.env.NEXT_PUBLIC_AI_PROVIDER || 'minimax'}</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <strong>Model:</strong>
                    <span>{process.env.NEXT_PUBLIC_MINIMAX_MODEL || 'MiniMax-M3'}</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <strong>Base URL:</strong>
                    <span>{process.env.NEXT_PUBLIC_MINIMAX_BASE_URL || ''}</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <strong>API Key:</strong>
                    <span>{process.env.NEXT_PUBLIC_MINIMAX_API_KEY ? '已配置' : '未配置'}</span>
                </div>

                <div style={{ marginTop: 12 }}>
                    <button onClick={runCheck} disabled={loading} style={{ padding: '8px 12px', background: '#111', color: '#fff', border: 'none' }}>
                        {loading ? '测试中...' : '测试 MiniMax'}
                    </button>
                </div>

                {error && <div style={{ color: 'crimson' }}>调用失败：{error}</div>}

                {result && (
                    <div style={{ border: '1px solid #e6e6e6', padding: 12, background: '#fafafa' }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <strong>Status:</strong>
                            <span>{result.status}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <strong>Provider:</strong>
                            <span>{result.provider}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <strong>Model:</strong>
                            <span>{result.model}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <strong>Base URL:</strong>
                            <span>{result.base_url}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <strong>API Key:</strong>
                            <span>{result.has_api_key ? '已配置' : '未配置'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <strong>Latency:</strong>
                            <span>{result.latency_ms} ms</span>
                        </div>

                        <details style={{ marginTop: 12 }}>
                            <summary>Raw Response</summary>
                            <pre style={{ maxHeight: 300, overflow: 'auto', background: '#fff', padding: 8 }}>{JSON.stringify(result.raw_response, null, 2)}</pre>
                        </details>
                    </div>
                )}
            </div>
        </main>
    )
}
