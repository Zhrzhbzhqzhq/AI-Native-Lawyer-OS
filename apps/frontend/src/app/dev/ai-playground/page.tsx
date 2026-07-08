"use client"
import React, { useState } from 'react'

const DEFAULT = `张三于2024年3月15日向李四出借人民币100000元。双方通过微信约定借款期限一年。张三通过银行转账向李四支付100000元。李四承诺于2025年3月15日前归还。到期后李四未还款。张三多次微信催收，李四回复“最近资金紧张，过段时间还”。目前仍未还款。`

export default function AIPlayground() {
    const [loading, setLoading] = useState(false)
    const [caseSummary, setCaseSummary] = useState(DEFAULT)
    const [result, setResult] = useState<any | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function run() {
        setLoading(true)
        setError(null)
        setResult(null)
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'
            const res = await fetch(`${apiBase}/ai/playground`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ case_summary: caseSummary }) })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
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
            <h1 style={{ marginBottom: 8 }}>AI Playground</h1>
            <p style={{ color: '#666', marginTop: 0 }}>开发工具 — 测试 LawDesk AI 全流程推理（仅供开发使用，不写入数据库）</p>

            <div style={{ display: 'grid', gap: 8, maxWidth: 980, marginTop: 16 }}>
                <textarea value={caseSummary} onChange={e => setCaseSummary(e.target.value)} style={{ width: '100%', minHeight: 160, padding: 12, background: '#fff', color: '#111' }} />

                <div>
                    <button onClick={run} disabled={loading} style={{ padding: '8px 12px', background: '#111', color: '#fff', border: 'none' }}>{loading ? '测试中...' : '开始测试'}</button>
                </div>

                {error && <div style={{ color: 'crimson' }}>调用失败：{error}</div>}

                {result && (
                    <div style={{ border: '1px solid #e6e6e6', padding: 12, background: '#fafafa' }}>
                        <div style={{ display: 'flex', gap: 12 }}><strong>Provider:</strong><span>{result.provider}</span></div>
                        <div style={{ display: 'flex', gap: 12 }}><strong>Model:</strong><span>{result.model}</span></div>
                        <div style={{ display: 'flex', gap: 12 }}><strong>Latency:</strong><span>{result.latency_ms} ms</span></div>
                        <div style={{ display: 'flex', gap: 12 }}><strong>Fallback:</strong><span>{result.fallback_used ? '是' : '否'}</span></div>

                        <h3>Steps</h3>
                        <div style={{ display: 'grid', gap: 8 }}>
                            <section>
                                <strong>Evidence</strong>
                                <pre style={{ whiteSpace: 'pre-wrap', background: '#fff', padding: 8 }}>{JSON.stringify(result.steps.evidence, null, 2)}</pre>
                            </section>
                            <section>
                                <strong>Facts</strong>
                                <pre style={{ whiteSpace: 'pre-wrap', background: '#fff', padding: 8 }}>{JSON.stringify(result.steps.facts, null, 2)}</pre>
                            </section>
                            <section>
                                <strong>Issues</strong>
                                <pre style={{ whiteSpace: 'pre-wrap', background: '#fff', padding: 8 }}>{JSON.stringify(result.steps.issues, null, 2)}</pre>
                            </section>
                            <section>
                                <strong>Laws</strong>
                                <pre style={{ whiteSpace: 'pre-wrap', background: '#fff', padding: 8 }}>{JSON.stringify(result.steps.laws, null, 2)}</pre>
                            </section>
                            <section>
                                <strong>Arguments</strong>
                                <pre style={{ whiteSpace: 'pre-wrap', background: '#fff', padding: 8 }}>{JSON.stringify(result.steps.arguments, null, 2)}</pre>
                            </section>
                            <section>
                                <strong>Documents</strong>
                                <pre style={{ whiteSpace: 'pre-wrap', background: '#fff', padding: 8 }}>{JSON.stringify(result.steps.documents, null, 2)}</pre>
                            </section>
                        </div>

                        <h3>Validation</h3>
                        <pre style={{ background: '#fff', padding: 8 }}>{JSON.stringify(result.validation, null, 2)}</pre>

                        <details style={{ marginTop: 12 }}>
                            <summary>Raw Responses</summary>
                            <pre style={{ maxHeight: 400, overflow: 'auto', background: '#fff', padding: 8 }}>{JSON.stringify(result.raw, null, 2)}</pre>
                        </details>
                    </div>
                )}

            </div>
        </main>
    )
}
