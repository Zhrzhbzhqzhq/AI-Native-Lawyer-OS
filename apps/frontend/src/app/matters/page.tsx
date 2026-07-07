"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Matter = {
  id?: string
  matter_id: string
  title: string
  description?: string
  status?: string
  ai_status?: string
  next_step?: string
  priority?: string
}

const API = (path = '') => `http://localhost:4000${path}`

export default function MattersPage() {
  const [matters, setMatters] = useState<Matter[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [showCreate, setShowCreate] = useState(false)

  // Keep original fetch/create/delete logic available but hide DB fields from UI
  async function fetchMatters() {
    setLoading(true)
    try {
      const res = await fetch(API('/matters'))
      const data = await res.json()
      let list: any[] = []
      if (Array.isArray(data)) list = data
      else if (data && Array.isArray((data as any).matters)) list = (data as any).matters
      else list = []
      setMatters(list)
    } catch (e) {
      // if backend not available, fall back to mock (handled below)
      console.warn('fetchMatters failed, continue with mock', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMatters() }, [])

  async function handleCreateMock() {
    // simple no-op: show a brief created toast or keep mock behavior
    setShowCreate(false)
  }

  // mock data for lawyer-facing view (10 matters)
  const mockMatters: Array<Matter & { ai_status?: string; next_step?: string; priority?: string }> = [
    { matter_id: 'demo-001', title: '张三诉李四民间借贷纠纷', status: '证据准备', ai_status: '等待银行流水', next_step: '补强证据', priority: '★★★★★' },
    { matter_id: 'demo-002', title: '北京XX公司买卖合同纠纷', status: '法律检索', ai_status: 'AI正在检索案例', next_step: '进入法律检索', priority: '★★★★☆' },
    { matter_id: 'demo-003', title: '王某劳动争议', status: '法律检索', ai_status: 'AI正在检索案例', next_step: '进入法律检索', priority: '★★★★☆' },
    { matter_id: 'demo-004', title: '刘某交通事故责任纠纷', status: '证据准备', ai_status: 'AI正在整理证据目录', next_step: '补强证据', priority: '★★★☆☆' },
    { matter_id: 'demo-005', title: '赵某离婚纠纷', status: '文书起草', ai_status: 'AI正在生成起诉状', next_step: '起草起诉状', priority: '★★★☆☆' },
    { matter_id: 'demo-006', title: '陈某建设工程合同纠纷', status: '庭审准备', ai_status: 'AI正在生成庭审提纲', next_step: '准备庭审', priority: '★★☆☆☆' },
    { matter_id: 'demo-007', title: '李某股权转让纠纷', status: '接案', ai_status: 'AI等待律师确认', next_step: '确认诉讼请求', priority: '★★☆☆☆' },
    { matter_id: 'demo-008', title: '孙某房屋买卖合同纠纷', status: '执行', ai_status: '等待执行反馈', next_step: '申请执行', priority: '★☆☆☆☆' },
    { matter_id: 'demo-009', title: '周某执行异议之诉', status: '开庭', ai_status: '等待法院排期开庭', next_step: '准备庭审', priority: '★★★☆☆' },
    { matter_id: 'demo-010', title: '吴某劳动报酬纠纷', status: '结案整理', ai_status: 'AI正在整理结案材料', next_step: '案件归档', priority: '★☆☆☆☆' },
  ]

  // For prototype: force using mockMatters for UI display (keep fetch logic intact)
  const sourceMatters = mockMatters
  const priorityOrder: Record<string, number> = { '★★★★★': 5, '★★★★☆': 4, '★★★☆☆': 3, '★★☆☆☆': 2, '★☆☆☆☆': 1 }
  const enriched = sourceMatters.map((m, i) => ({
    ...m,
    ai_status: (m as any).ai_status ?? '',
    next_step: (m as any).next_step ?? '',
    priority: (m as any).priority ?? '★★★☆☆'
  }))
  const displayMatters = enriched.sort((a, b) => (priorityOrder[b.priority as string] || 0) - (priorityOrder[a.priority as string] || 0)).slice(0, 10)

  const stats = {
    inProgress: 18,
    todayTodo: 4,
    aiAdvancing: 6,
    weekCourts: 2,
  }

  const aiSuggestion = {
    title: '张三诉李四民间借贷纠纷',
    reason: '只差银行流水即可进入法律检索阶段。',
    estimate: '20 分钟'
  }

  const aiWorkStatus = [
    { title: '张三诉李四', task: '法律检索', note: '进度：56% · 预计：3分钟' },
    { title: '王五劳动争议', task: '类案检索', note: '进度：72% · 预计：5分钟' },
    { title: '赵某离婚纠纷', task: '起草起诉状', note: '进度：35% · 预计：8分钟' },
  ]

  const aiTopImportant = {
    stars: '★★★★★',
    title: '张三诉李四民间借贷纠纷',
    stage: '证据准备',
    reason: '只差银行流水即可进入法律检索。',
    lawyerWork: '5 分钟',
    aiFollow: ['自动更新 Proof Map', '自动开始法律检索', '自动生成诉讼路线'],
  }

  const router = useRouter()
  function openMatterLink(matter_id: string) {
    router.push(`/matters/${encodeURIComponent(matter_id)}`)
  }

  function openMatterByTitle(title: string) {
    const found = displayMatters.find((d) => d.title === title)
    if (found && found.matter_id) {
      openMatterLink(found.matter_id)
    } else {
      console.warn('No matter found for title', title)
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>案件中心</h1>
          <div style={{ marginTop: 6, color: '#64748b' }}>AI 正在协助管理和推进你的案件。</div>
          <div style={{ marginTop: 12 }}>
            <input placeholder="🔍 搜索案件、客户、案号……" style={{ width: 420, padding: '8px 10px', borderRadius: 8, border: '1px solid #e6eef6' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowCreate(s => !s)} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, fontSize: 16 }}>＋ AI 接案</button>
        </div>
      </div>

      {showCreate ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #e6eef6' }}>
          <div style={{ fontWeight: 700 }}>新建案件（演示）</div>
          <div style={{ marginTop: 8, color: '#64748b' }}>此处为简易占位，不连接后端。</div>
          <div style={{ marginTop: 12 }}>
            <button onClick={handleCreateMock} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6 }}>创建（模拟）</button>
            <button onClick={() => setShowCreate(false)} style={{ marginLeft: 8, padding: '8px 12px', borderRadius: 6 }}>取消</button>
          </div>
        </div>
      ) : null}

      {/* Top stats */}
      <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
        <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e6eef6', minWidth: 160 }}>
          <div style={{ color: '#64748b' }}>进行中案件</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{stats.inProgress}</div>
        </div>
        <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e6eef6', minWidth: 160 }}>
          <div style={{ color: '#64748b' }}>今日待处理</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{stats.todayTodo}</div>
        </div>
        <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e6eef6', minWidth: 160 }}>
          <div style={{ color: '#64748b' }}>AI 正在推进</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{stats.aiAdvancing}</div>
        </div>
        <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e6eef6', minWidth: 160 }}>
          <div style={{ color: '#64748b' }}>本周开庭</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{stats.weekCourts ?? 2}</div>
        </div>
      </div>

      {/* Main content: list + right panel */}
      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>
        <div>
          <div style={{ background: '#fff', border: '1px solid #e6eef6', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>案件</div>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
              {displayMatters.map((m) => (
                <div key={m.matter_id} style={{ background: '#fff', border: '1px solid #e6eef6', borderRadius: 12, padding: 16, height: 240, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{m.priority}</div>
                    <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                  </div>

                  <div style={{ marginTop: 8, flex: 1, overflowY: 'auto' }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: 12 }}>当前阶段</div>
                      <div style={{ marginTop: 4, color: '#0f172a', fontSize: 13 }}>{m.status}</div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <div style={{ color: '#64748b', fontSize: 12 }}>AI 状态</div>
                      <div style={{ marginTop: 4, color: '#0f172a', fontSize: 13, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.ai_status}</div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <div style={{ color: '#64748b', fontSize: 12 }}>下一步</div>
                      <div style={{ marginTop: 4, color: '#0f172a', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.next_step}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button
                      onClick={() => openMatterLink(m.matter_id)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                      style={{
                        width: 'fit-content',
                        height: 30,
                        padding: '0 10px',
                        fontSize: 13,
                        fontWeight: 500,
                        borderRadius: 6,
                        background: '#fff',
                        border: '1px solid #2563eb',
                        color: '#2563eb',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      查看
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* footer: recent 10 and view all */}
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#64748b' }}>显示最近 10 个案件</div>
            <button style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: 8 }}>查看全部案件（18）</button>
          </div>
        </div>

        <aside>
          {/* AI Chief consolidated */}
          <div style={{ background: '#fff', border: '1px solid #e6eef6', borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>AI Chief</div>

            {/* 今天最重要 */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 700 }}>今天最重要</div>
              <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800 }}>{aiTopImportant.stars}</div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>{aiTopImportant.title}</div>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => openMatterByTitle(aiTopImportant.title)} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: 8 }}>立即处理</button>
              </div>
            </div>

            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #f1f5f9' }} />

            {/* AI 正在推进 */}
            <div>
              <div style={{ fontWeight: 700 }}>AI 正在推进</div>
              <div style={{ marginTop: 8 }}>
                {aiWorkStatus.map((s, i) => (
                  <div key={s.title + i} style={{ marginTop: i === 0 ? 8 : 10 }}>
                    <div style={{ fontWeight: 700 }}>{s.title}</div>
                    <div style={{ color: '#64748b', marginTop: 4 }}>{s.task}</div>
                    <div style={{ color: '#64748b', marginTop: 4 }}>{s.note}</div>
                  </div>
                ))}
              </div>
            </div>

            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #f1f5f9' }} />

            {/* AI 等待律师 */}
            <div>
              <div style={{ fontWeight: 700 }}>AI 等待律师</div>
              <div style={{ marginTop: 8, color: '#64748b' }}>
                需要律师：
                <ul style={{ marginTop: 6 }}>
                  <li>上传流水</li>
                  <li>确认诉讼请求</li>
                  <li>审核起诉状</li>
                </ul>
              </div>
            </div>

            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #f1f5f9' }} />

            {/* 今日完成 */}
            <div>
              <div style={{ fontWeight: 700 }}>今日完成</div>
              <ul style={{ marginTop: 8 }}>
                <li>材料分类</li>
                <li>Proof Map</li>
                <li>类案推荐</li>
                <li>法条推荐</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
