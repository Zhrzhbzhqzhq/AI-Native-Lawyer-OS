"use client"
import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

const lawdesk = {
  pageBg: '#f4f7fb',
  cardBg: '#ffffff',
  border: '#e6eef6',
  text: '#0f172a',
  muted: '#64748b',
  blue: '#2563eb',
  radius: 8,
}

export default function DocumentWorkspacePage() {
  // Minimal mock state for the workflow
  const [currentStep, setCurrentStep] = useState<number>(1) // 1..5
  const [showAllDocs, setShowAllDocs] = useState(false)
  const docTypes = ['民事起诉状', '答辩状', '代理词', '上诉状', '执行申请书']
  const [selectedDocType, setSelectedDocType] = useState<string>(docTypes[0])
  const [supplementNotes, setSupplementNotes] = useState<string>('请确认证据时间线并补充完整银行流水。')

  // Draft state
  const [isDrafting, setIsDrafting] = useState(false)
  const [draftContent, setDraftContent] = useState<string>('')
  const [draftVersion, setDraftVersion] = useState<number>(0)

  // Concept review (Step3)
  const [reviewComments, setReviewComments] = useState<string[]>([])
  const [newComment, setNewComment] = useState<string>('')

  // Final edit state (Step4)
  const [finalContent, setFinalContent] = useState<string>('')
  const [approved, setApproved] = useState(false)
  const params = useParams()
  const router = useRouter()
  const matterId = (params as any)?.matter_id || (params as any)?.id || ''

  const recommended = [
    { id: 'd1', stars: 5, title: '民事起诉状（推荐）' },
    { id: 'd2', stars: 4, title: '证据目录' },
    { id: 'd3', stars: 4, title: '财产保全申请书' },
    { id: 'd4', stars: 3, title: '财产调查令申请' },
  ]

  // Documents workspace fetched from backend (read-only)
  const [documentsWorkspace, setDocumentsWorkspace] = useState<any | null>(null)

  useEffect(() => {
    if (!matterId) return
    const url = `/matters/${matterId}/documents/workspace`
    fetch(url).then((res) => {
      if (!res.ok) return null
      return res.json()
    }).then((json) => {
      if (json) setDocumentsWorkspace(json)
    }).catch(() => {
      // keep null on error (fallback to mocks)
    })
  }, [matterId])

  // realDocumentList: map backend items to expected shape
  const realDocumentList: any[] = Array.isArray(documentsWorkspace?.document_list) ? (documentsWorkspace!.document_list as any[]) : []
  const realDocumentListOrFallback = realDocumentList.length ? realDocumentList : recommended.map((r) => ({ document_id: r.id, title: r.title, document_type: '', status: 'recommended', version: '', updated_at: null, content_uri: null, stars: r.stars }))

  // realDocumentSummary: map workspace summary
  const realDocumentSummary: any = documentsWorkspace?.summary ?? null
  const realDocumentSummaryOrFallback = realDocumentSummary ? realDocumentSummary : { total: 0, completed: 0, draft: 0, need_review: 0, missing: 0 }

  // realSelectedDocument: map selected_document from workspace
  const realSelectedDocument: any = documentsWorkspace?.selected_document ?? null
  const realSelectedDocumentOrFallback = realSelectedDocument ? realSelectedDocument : {
    document_id: 'mock-d1',
    title: '民事起诉状（示例）',
    document_type: 'complaint',
    status: 'draft',
    version: 'v1',
    updated_at: null,
    ai_summary: { status: 'rule_based', score: 50, completeness: 'low', strengths: [], risks: [], recommendations: [] },
    lawyer_notes: { status: 'read_only', message: 'Lawyer notes coming soon' },
    related_materials: [],
    related_evidence: [],
  }

  const categories: Record<string, string[]> = {
    '起诉阶段': ['民事起诉状', '证据目录', '保全申请书'],
    '答辩阶段': ['答辩状', '举证意见'],
    '庭审阶段': ['庭审笔录', '庭审要点清单'],
    '执行阶段': ['执行申请书', '财产线索清单'],
    '其他文书': ['函件', '律师函']
  }

  const timelineSteps = [
    { id: 1, title: '第一步｜律师确认本次使用资料' },
    { id: 2, title: '第二步｜AI起草初稿' },
    { id: 3, title: '第三步｜第一次预览（提出修改意见）' },
    { id: 4, title: '第四步｜最终编辑' },
    { id: 5, title: '第五步｜文书定稿' },
  ]

  return (
    <main style={{ padding: 20, background: lawdesk.pageBg, minHeight: '80vh' }}>
      <div style={{ padding: 16, borderRadius: 12, background: lawdesk.cardBg, border: `1px solid ${lawdesk.border}`, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>文书工作区</h2>
        <div style={{ marginTop: 6, color: lawdesk.muted }}>AI 起草 · 律师审阅 · 律师定稿</div>
      </div>

      {/* AI 已接收案件研究成果：文书工作区交接卡片（两列展示） */}
      <div style={{ marginTop: 12, background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 800, color: lawdesk.text }}>研究成果</div>
            <div style={{ marginTop: 8, color: lawdesk.muted }}>
              <div>✓ 文书总数（{realDocumentSummaryOrFallback.total}）</div>
              <div>✓ 已完成（{realDocumentSummaryOrFallback.completed}）</div>
              <div>✓ 草稿（{realDocumentSummaryOrFallback.draft}）</div>
              <div>✓ 待审（{realDocumentSummaryOrFallback.need_review}）</div>
              <div>✓ 缺失（{realDocumentSummaryOrFallback.missing}）</div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 800, color: lawdesk.text }}>已生成成果</div>
            <div style={{ marginTop: 8, color: lawdesk.muted }}>
              <div>✓ Proof Map</div>
              <div>✓ Litigation Plan</div>
              <div>✓ AI 法律意见</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, color: lawdesk.muted }}>这些研究成果将自动用于：起诉状 / 证据目录 / 代理词 / 庭审提纲</div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          {/* Remove '开始起草' button per spec */}
          <button style={{ padding: '8px 12px', borderRadius: 6, background: '#f1f5f9', color: lawdesk.muted, border: 'none' }}>查看研究详情</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Left column */}
        <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div id="doc-workflow" style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
            <div style={{ fontWeight: 800, color: lawdesk.text }}>文书类型</div>
            <div style={{ marginTop: 6, color: lawdesk.muted }}>请选择本次需要起草的法律文书。</div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {realDocumentListOrFallback.map((r) => (
                <div key={r.document_id || r.id} style={{ padding: 10, background: '#fff', borderRadius: 8, border: `1px solid ${lawdesk.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{(r.stars ? ('★'.repeat(r.stars) + '☆'.repeat(5 - r.stars)) : '')} {r.title}</div>
                    <div style={{ color: lawdesk.muted, fontSize: 12 }}>{r.document_type || r.status || ''}</div>
                  </div>
                  <div>
                    <button style={{ padding: '6px 10px', borderRadius: 6, background: lawdesk.blue, color: '#fff', border: 'none' }}>选择</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <button onClick={() => setShowAllDocs((s) => !s)} style={{ padding: '8px 12px', borderRadius: 6, background: '#f1f5f9', color: lawdesk.text, border: 'none' }}>{showAllDocs ? '收起' : '查看全部文书'}</button>
            </div>
          </div>

          {showAllDocs ? (
            <div style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
              <div style={{ fontWeight: 800, color: lawdesk.text }}>全部文书（按阶段）</div>
              <div style={{ marginTop: 8, color: lawdesk.muted }}>
                {Object.entries(categories).map(([cat, list]) => (
                  <div key={cat} style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 700 }}>{cat}</div>
                    <ul style={{ marginTop: 6, color: lawdesk.muted }}>
                      {list.map((it) => <li key={it}>{it}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right column */}
        <div style={{ flex: 1 }}>
          <div style={{ background: lawdesk.cardBg, padding: 12, borderRadius: lawdesk.radius, border: `1px solid ${lawdesk.border}` }}>
            <div style={{ fontWeight: 800, color: lawdesk.text }}>当前文书工作流</div>
            <div style={{ marginTop: 8, color: lawdesk.muted }}>六步流程 · 当前步骤展开，已完成折叠，未开始灰色。</div>

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {timelineSteps.map((step) => {
                const done = step.id < currentStep
                const active = step.id === currentStep
                const notStarted = step.id > currentStep
                return (
                  <div key={step.id} style={{ padding: 12, background: '#fff', borderRadius: 8, border: `1px solid ${lawdesk.border}`, opacity: notStarted ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 18, background: done ? '#e6f0ff' : active ? lawdesk.blue : '#eef2f6', color: active ? '#fff' : lawdesk.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{step.id}</div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{step.title}</div>
                          <div style={{ color: lawdesk.muted, fontSize: 13 }}>{active ? '进行中' : done ? '已完成' : '未开始'}</div>
                        </div>
                      </div>
                      <div>
                        {active ? <button style={{ padding: '6px 10px', borderRadius: 6, background: lawdesk.blue, color: '#fff', border: 'none' }}>查看</button> : null}
                      </div>
                    </div>

                    {/* Expanded content only for current step */}
                    {active ? (
                      <div style={{ marginTop: 10 }}>
                        {step.id === 1 && (
                          <div>
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontWeight: 700 }}>选择文书类型</div>
                              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>已自动继承案件研究成果（案例、法条、裁判规则、诉讼路线）。</div>
                              <select value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)} style={{ marginTop: 6, padding: 8, borderRadius: 6, border: `1px solid ${lawdesk.border}`, width: 260 }}>
                                {docTypes.map((d) => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>

                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontWeight: 700 }}>律师授权本次使用资料</div>
                              <div style={{ marginTop: 6, color: lawdesk.muted }}>请选择允许 AI 使用的案件材料。</div>
                              <ul style={{ marginTop: 6, color: lawdesk.muted }}>
                                <li>微信聊天记录（示例）</li>
                                <li>部分银行转账截图</li>
                                <li>客户陈述笔录（草稿）</li>
                              </ul>
                            </div>

                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontWeight: 700 }}>律师补充说明（可选）</div>
                              <textarea value={supplementNotes} onChange={(e) => setSupplementNotes(e.target.value)} style={{ width: '100%', minHeight: 80, marginTop: 6, padding: 8, borderRadius: 6, border: `1px solid ${lawdesk.border}` }} />
                            </div>

                            <div style={{ marginTop: 12 }}>
                              <button onClick={async () => {
                                // start AI drafting simulation
                                setIsDrafting(true)
                                setCurrentStep(2)
                                setDraftContent('')
                                setDraftVersion(0)
                                await new Promise(r => setTimeout(r, 900))
                                setDraftContent(`【AI Draft V1 - ${selectedDocType}】\n\n（本为模拟草稿）\n主要事实：双方于某日发生借贷行为……\n证据目录：微信聊天、部分转账截图`)
                                setDraftVersion(1)
                                setIsDrafting(false)
                                // automatically advance to concept review
                                setCurrentStep(3)
                              }} style={{ padding: '8px 12px', borderRadius: 6, background: lawdesk.blue, color: '#fff', border: 'none' }}>授权 AI 起草</button>
                            </div>
                          </div>
                        )}

                        {step.id === 2 && (
                          <div>
                            {isDrafting ? (
                              <div style={{ color: lawdesk.muted }}>AI 正在起草……</div>
                            ) : (
                              <div>
                                <div style={{ fontWeight: 700 }}>第二步｜AI起草初稿</div>
                                <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', color: lawdesk.muted }}>{draftContent}</div>
                                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                  <button onClick={() => setCurrentStep(1)} style={{ padding: '8px 12px', borderRadius: 6, background: '#f1f5f9', color: lawdesk.text, border: 'none' }}>返回上一步</button>
                                  <button onClick={() => setCurrentStep(3)} style={{ padding: '8px 12px', borderRadius: 6, background: lawdesk.blue, color: '#fff', border: 'none' }}>进入第一次预览</button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {step.id === 3 && (
                          <div>
                            <div style={{ fontWeight: 700 }}>第三步｜第一次预览（提出修改意见）</div>
                            <textarea value={draftContent} readOnly style={{ width: '100%', minHeight: 160, marginTop: 8, padding: 8, borderRadius: 6, border: `1px solid ${lawdesk.border}`, background: '#fafafa' }} />

                            <div style={{ marginTop: 10 }}>
                              <div style={{ fontWeight: 700 }}>告诉 AI 如何修改</div>
                              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="例如：增加微信聊天分析；增加最高院案例；删除违约金请求；完善诉讼请求" style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${lawdesk.border}` }} />
                                <button onClick={() => { if (newComment.trim()) { setReviewComments((p) => [...p, newComment.trim()]); setNewComment('') } }} style={{ padding: '8px 12px', borderRadius: 6, background: '#f1f5f9', border: 'none' }}>添加意见</button>
                              </div>
                              <div style={{ marginTop: 8 }}>
                                {reviewComments.length === 0 ? <div style={{ color: lawdesk.muted }}>暂无审稿意见</div> : (
                                  <ul style={{ color: lawdesk.muted }}>
                                    {reviewComments.map((c, i) => (<li key={i}>{c}</li>))}
                                  </ul>
                                )}
                              </div>
                            </div>

                            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                              <button onClick={() => setCurrentStep(2)} style={{ padding: '8px 12px', borderRadius: 6, background: '#f1f5f9', color: lawdesk.text, border: 'none' }}>返回上一步</button>
                              <button onClick={async () => {
                                // Simulate AI updating draft based on comments
                                if (reviewComments.length === 0) return
                                setIsDrafting(true)
                                await new Promise(r => setTimeout(r, 700))
                                const added = '\n\n【AI 修改记录】\n' + reviewComments.map((c, i) => `- ${c}`).join('\n')
                                setDraftContent((d) => d + added)
                                setDraftVersion((v) => v + 1)
                                setReviewComments([])
                                setIsDrafting(false)
                              }} style={{ padding: '8px 12px', borderRadius: 6, background: lawdesk.blue, color: '#fff', border: 'none' }}>AI 根据意见修改</button>

                              <button onClick={() => {
                                setDraftContent((d) => d.replace(/^【AI Draft V1[^】]*】\s*(（本为模拟草稿）\s*)?/, '').replace(/^\s+/, ''))
                                setCurrentStep(4)
                              }} style={{ padding: '8px 12px', borderRadius: 6, background: '#f1f5f9', border: 'none' }}>确认进入最终编辑</button>
                            </div>
                          </div>
                        )}

                        {/* Selected Document Card: display selected document metadata and AI/Lawyer notes (read-only) */}
                        {step.id === 2 && (
                          <div>
                            <div style={{ fontWeight: 700 }}>第二步｜AI起草初稿（选中文书预览）</div>
                            <div style={{ marginTop: 8, color: lawdesk.muted }}>
                              <div style={{ fontWeight: 700 }}>{realSelectedDocumentOrFallback.title}</div>
                              <div style={{ marginTop: 6 }}>{realSelectedDocumentOrFallback.document_type} · {realSelectedDocumentOrFallback.status} · {realSelectedDocumentOrFallback.version}</div>
                              <div style={{ marginTop: 8, color: lawdesk.muted }}>最后更新时间：{realSelectedDocumentOrFallback.updated_at || '—'}</div>

                              <div style={{ marginTop: 10 }}>
                                <div style={{ fontWeight: 700 }}>AI 分析</div>
                                <div style={{ marginTop: 6, color: lawdesk.muted }}>{realSelectedDocumentOrFallback.ai_summary ? (`得分：${realSelectedDocumentOrFallback.ai_summary.score} 完成度：${realSelectedDocumentOrFallback.ai_summary.completeness}`) : '无'}</div>
                              </div>

                              <div style={{ marginTop: 10 }}>
                                <div style={{ fontWeight: 700 }}>律师备注</div>
                                <div style={{ marginTop: 6, color: lawdesk.muted }}>{realSelectedDocumentOrFallback.lawyer_notes ? realSelectedDocumentOrFallback.lawyer_notes.message : '无'}</div>
                              </div>

                              <div style={{ marginTop: 10 }}>
                                <div style={{ fontWeight: 700 }}>相关材料 / 证据</div>
                                <div style={{ marginTop: 6, color: lawdesk.muted }}>{(Array.isArray(realSelectedDocumentOrFallback.related_materials) && realSelectedDocumentOrFallback.related_materials.length) ? realSelectedDocumentOrFallback.related_materials.map((m: any) => m.title || m.material_id).join(', ') : '无'}</div>
                                <div style={{ marginTop: 6, color: lawdesk.muted }}>{(Array.isArray(realSelectedDocumentOrFallback.related_evidence) && realSelectedDocumentOrFallback.related_evidence.length) ? realSelectedDocumentOrFallback.related_evidence.map((e: any) => e.title || e.evidence_id).join(', ') : ''}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {step.id === 4 && (
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 16 }}>第四步｜最终编辑</div>
                            <div style={{ marginTop: 8, color: lawdesk.muted }}>
                              AI 已完成修改。
                              <br />请律师进行最终审核。
                              <br />本阶段所有修改均由律师直接完成，AI 不会再次自动修改正文。
                            </div>

                            {/* Word-style toolbar (single row) */}
                            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', borderBottom: `1px solid ${lawdesk.border}`, paddingBottom: 8 }}>
                              <button onClick={() => { if (finalContent) setDraftContent(finalContent) }} style={{ padding: '6px 10px', borderRadius: 6, background: '#f1f5f9', border: 'none' }}>保存</button>
                              <button onClick={() => { /* noop undo UI */ }} style={{ padding: '6px 10px', borderRadius: 6, background: '#fff', border: `1px solid ${lawdesk.border}` }}>撤销</button>
                              <button onClick={() => { /* noop redo UI */ }} style={{ padding: '6px 10px', borderRadius: 6, background: '#fff', border: `1px solid ${lawdesk.border}` }}>恢复</button>

                              <select defaultValue="宋体" style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${lawdesk.border}` }}>
                                <option>宋体</option>
                                <option>仿宋</option>
                                <option>黑体</option>
                                <option>Times New Roman</option>
                              </select>
                              <select defaultValue="14" style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${lawdesk.border}` }}>
                                <option>12</option>
                                <option>14</option>
                                <option>16</option>
                                <option>18</option>
                              </select>

                              <button style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${lawdesk.border}` }}>B</button>
                              <button style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${lawdesk.border}` }}>U</button>

                              <button style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${lawdesk.border}` }}>左对齐</button>
                              <button style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${lawdesk.border}` }}>居中</button>
                              <button style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${lawdesk.border}` }}>右对齐</button>

                              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button onClick={() => {
                                  const content = finalContent || draftContent
                                  const blob = new Blob([content], { type: 'application/msword' })
                                  const url = URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = `${selectedDocType.replace(/\s+/g, '_')}_Final.doc`
                                  a.click()
                                  URL.revokeObjectURL(url)
                                }} style={{ padding: '6px 10px', borderRadius: 6, background: '#f1f5f9', border: 'none' }}>导出 Word</button>

                                <button onClick={() => { const w = window.open(); if (w) { w.document.write('<pre>' + (finalContent || draftContent) + '</pre>'); w.document.close(); w.print(); } }} style={{ padding: '6px 10px', borderRadius: 6, background: '#f1f5f9', border: 'none' }}>打印</button>

                                <div style={{ textAlign: 'right', color: lawdesk.muted }}>
                                  <div style={{ color: '#10b981', fontWeight: 700 }}>● 已保存</div>
                                  <div style={{ fontSize: 12 }}>11:42 · 100% · 第 1 页</div>
                                </div>
                              </div>
                            </div>

                            {/* Word-style A4 page centered with margins */}
                            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', background: '#f4f7fb', padding: 16 }}>
                              <div style={{ width: 794, minHeight: 1123, height: 'auto', background: '#fff', boxShadow: '0 6px 18px rgba(15,23,42,0.06)', padding: 64, border: `1px solid ${lawdesk.border}`, overflow: 'auto' }}>
                                <div contentEditable suppressContentEditableWarning onInput={(e) => setFinalContent((e.target as HTMLDivElement).innerText)} style={{ outline: 'none', minHeight: 400, color: lawdesk.text, fontSize: 15, lineHeight: '1.8', textAlign: 'left', fontFamily: 'serif' }}>
                                  <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16, textAlign: 'center' }}>民事起诉状</div>
                                  <div style={{ whiteSpace: 'pre-wrap' }}>{finalContent || draftContent || `原告：\n被告：\n案由：民间借贷纠纷\n\n诉讼请求：\n1. \n2. \n3. \n\n事实与理由：\n……\n\n证据目录：\n1. \n2. \n3. \n\n此致\nXX人民法院\n\n具状人：\n\n日期：`}</div>
                                </div>
                              </div>
                            </div>

                            {/* Bottom action buttons: unified set */}
                            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                              <button onClick={() => setCurrentStep(3)} style={{ padding: '8px 12px', borderRadius: 6, background: '#f1f5f9', color: lawdesk.text, border: 'none' }}>← 返回上一步</button>
                              <button onClick={() => { if (finalContent) setDraftContent(finalContent) }} style={{ padding: '8px 12px', borderRadius: 6, background: '#10b981', color: '#fff', border: 'none' }}>保存</button>
                              <button onClick={() => {
                                const content = finalContent || draftContent
                                const blob = new Blob([content], { type: 'application/msword' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `${selectedDocType.replace(/\s+/g, '_')}_Final.doc`
                                a.click()
                                URL.revokeObjectURL(url)
                              }} style={{ padding: '8px 12px', borderRadius: 6, background: '#f1f5f9', border: 'none' }}>导出 Word</button>
                              <button onClick={() => { setApproved(true); setCurrentStep(5); }} style={{ padding: '8px 12px', borderRadius: 6, background: lawdesk.blue, color: '#fff', border: 'none' }}>确认定稿</button>
                            </div>
                          </div>
                        )}

                        {step.id === 5 && (
                          <div>
                            <div style={{ fontWeight: 800 }}>第五步｜文书定稿</div>
                            <div style={{ marginTop: 6, color: lawdesk.muted }}>版本：Final · 生成时间：2026-07-06</div>
                            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                              <button onClick={() => setCurrentStep(4)} style={{ padding: '8px 12px', borderRadius: 6, background: '#f1f5f9', color: lawdesk.text, border: 'none' }}>← 返回上一步</button>
                              <button onClick={() => {
                                const blob = new Blob([draftContent], { type: 'application/msword' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `${selectedDocType.replace(/\s+/g, '_')}_Final.doc`
                                a.click()
                                URL.revokeObjectURL(url)
                              }} style={{ padding: '8px 12px', borderRadius: 6, background: '#0ea5a0', color: '#fff', border: 'none' }}>导出 Word</button>
                              <button onClick={() => {
                                if (matterId) router.push(`/matters/${matterId}/evidence`)
                              }} style={{ padding: '8px 12px', borderRadius: 6, background: '#f1f5f9', color: lawdesk.text, border: 'none' }}>进入证据工作区</button>
                              <button onClick={() => {/* noop view */ }} style={{ padding: '8px 12px', borderRadius: 6, background: lawdesk.blue, color: '#fff', border: 'none' }}>完成</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
