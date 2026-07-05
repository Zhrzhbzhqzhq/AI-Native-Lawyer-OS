
"use client"

import React from 'react'

export default function ReportPage() {
  const evidence = {
    have: ['银行流水', '微信聊天记录', '借款承认'],
    missing: ['被告身份信息', '催款记录', '利息约定'],
    completeness: 86,
  }

  return (
    <main>
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
        <h2>AI 接案分析报告</h2>
        <div style={{ color: '#6b7280', marginTop: 6 }}>LawDesk 已完成客户咨询分析，并生成接案建议。</div>

        <div style={{ marginTop: 20, display: 'grid', gap: 20 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 18, border: '1px solid #eef2ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 20, color: '#0b5cff', fontWeight: 700 }}>★★★★★</div>
                <div style={{ fontWeight: 700, marginTop: 6 }}>建议接案</div>
                <div style={{ color: '#0b5cff', fontSize: 24, fontWeight: 800, marginTop: 6 }}>综合评分 92 分</div>
                <div style={{ marginTop: 6, color: '#6b7280' }}>民间借贷纠纷</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eef2ff' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>AI Chief</div>
              <div style={{ fontWeight: 600 }}>综合意见：</div>
              <div style={{ marginTop: 8 }}>本案属于典型民间借贷纠纷。目前证据链较完整。建议接受委托。</div>
              <div style={{ marginTop: 8, fontWeight: 600 }}>建议补充：</div>
              <ul style={{ marginTop: 6 }}>
                <li>被告身份信息</li>
                <li>催款证据</li>
              </ul>
            </div>

            <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eef2ff' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>案件分析</div>
              <div style={{ marginTop: 6 }}><strong>案件类型</strong> 民间借贷纠纷</div>
              <div style={{ marginTop: 6 }}><strong>诉讼请求</strong> 借款本金100000元</div>
              <div style={{ marginTop: 6 }}><strong>利息</strong> </div>
              <div style={{ marginTop: 6 }}><strong>法院</strong> 待确定</div>
              <div style={{ marginTop: 6 }}><strong>预计周期</strong> 4~6个月</div>
              <div style={{ marginTop: 6 }}><strong>预计工作量</strong> 中</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eef2ff' }}>
              <div style={{ fontWeight: 700 }}>证据完整性</div>
              <div style={{ marginTop: 8, fontSize: 14 }}>证据完整度 {evidence.completeness}%</div>
              <div style={{ height: 10, background: '#eef2ff', borderRadius: 6, marginTop: 8 }}>
                <div style={{ width: `${evidence.completeness}%`, height: '100%', background: '#0b5cff', borderRadius: 6 }} />
              </div>
              <div style={{ marginTop: 12, fontWeight: 600 }}>已有证据</div>
              <ul style={{ marginTop: 6 }}>
                {evidence.have.map((h) => (<li key={h}>✓ {h}</li>))}
              </ul>
              <div style={{ marginTop: 8, fontWeight: 600 }}>缺少证据</div>
              <ul style={{ marginTop: 6 }}>
                {evidence.missing.map((m) => (<li key={m}>□ {m}</li>))}
              </ul>
            </div>

            <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eef2ff' }}>
              <div style={{ fontWeight: 700 }}>风险分析</div>
              <div style={{ marginTop: 8 }}>
                <div>① 未签正式借条</div>
                <div style={{ color: '#6b7280' }}>影响：中</div>
              </div>
              <div style={{ marginTop: 8 }}>
                <div>② 身份信息不足</div>
                <div style={{ color: '#6b7280' }}>影响：低</div>
              </div>
              <div style={{ marginTop: 8 }}>
                <div>③ 利息约定不明确</div>
                <div style={{ color: '#6b7280' }}>影响：低</div>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #eef2ff' }}>
            <div style={{ fontWeight: 700 }}>下一步建议</div>
            <ol style={{ marginTop: 8 }}>
              <li>补充身份信息</li>
              <li>自动生成证据目录</li>
              <li>自动生成起诉状</li>
              <li>创建 Matter Workspace</li>
            </ol>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 6 }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ padding: '10px 14px', borderRadius: 8, background: '#fff', border: '1px solid #cbd5e1' }}
            >
              重新分析
            </button>
            <button
              type="button"
              onClick={() => alert('下一阶段实现')}
              style={{ padding: '10px 14px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none' }}
            >
              确认接案
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
