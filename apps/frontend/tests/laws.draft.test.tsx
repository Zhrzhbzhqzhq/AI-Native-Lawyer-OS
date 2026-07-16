import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LawsPage from '../src/app/matters/[matter_id]/laws/page'

let pushMock = vi.fn()
let persistedDrafts: any[] = []
let formalLaws: any[] = []

vi.mock('next/navigation', () => ({
  useParams: () => ({ matter_id: 'm-case01' }),
  useRouter: () => ({ push: (...args: any[]) => pushMock(...args) }),
}))

function jsonResponse(body: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  }
}

const issues = [
  { issue_id: 'issue-1', title: '双方是否成立民间借贷法律关系', description: '判断请求权基础。' },
  { issue_id: 'issue-2', title: '出借人是否已经完成借款交付义务', description: '判断本金请求。' },
  { issue_id: 'issue-3', title: '借款人是否构成到期未还的违约', description: '判断违约责任。' },
].map((item) => ({ ...item, matter_id: 'm-case01' }))

const generatedDrafts = [
  {
    id: 'law-draft-1',
    title: '民间借贷合同成立规则',
    citation: '《中华人民共和国民法典》第六百六十七条',
    rule_content: '借款合同是借款人向贷款人借款，到期返还借款并支付利息的合同。',
    application: '用于判断双方是否形成民间借贷法律关系。',
    limitations: '需要结合资金交付证据共同判断。',
    jurisdiction: '中国大陆',
    source_reference: 'mock-provider-deterministic-rule',
    source_issue_ids: ['issue-1'],
    ai_reasoning: '该规则直接回应借贷关系是否成立。',
    confidence: 0.92,
    review_status: 'pending',
  },
  {
    id: 'law-draft-2',
    title: '借款实际交付证明规则',
    citation: '民间借贷司法解释第二条',
    rule_content: '出借人应提交借据、收据、转账凭证等证明借贷关系存在的证据。',
    application: '用于判断出借人是否完成借款交付义务。',
    limitations: '需要核对流水金额与借条金额。',
    jurisdiction: '中国大陆',
    source_reference: 'mock-provider-deterministic-rule',
    source_issue_ids: ['issue-2'],
    ai_reasoning: '该规则直接回应资金是否已经交付。',
    confidence: 0.9,
    review_status: 'pending',
  },
  {
    id: 'law-draft-3',
    title: '债务到期履行与违约责任规则',
    citation: '《中华人民共和国民法典》第五百七十七条',
    rule_content: '一方不履行合同义务的，应承担继续履行等违约责任。',
    application: '用于判断到期未还是否构成违约。',
    limitations: '需要排除已清偿或展期抗辩。',
    jurisdiction: '中国大陆',
    source_reference: 'mock-provider-deterministic-rule',
    source_issue_ids: ['issue-3'],
    ai_reasoning: '该规则直接回应违约责任。',
    confidence: 0.89,
    review_status: 'pending',
  },
].map((draft) => ({ ...draft, matter_id: 'm-case01', published_law_id: null, published_at: null }))

describe('Laws Draft Workflow', () => {
  beforeEach(() => {
    pushMock = vi.fn()
    persistedDrafts = []
    formalLaws = []
    ;(global as any).fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = String(init?.method || 'GET').toUpperCase()

      if (url.includes('/matters/m-case01/issues')) {
        return jsonResponse(issues)
      }

      if (url.includes('/matters/m-case01/laws') && !url.includes('law-drafts')) {
        return jsonResponse(formalLaws)
      }

      if (url.includes('/matters/m-case01/law-drafts/generate') && method === 'POST') {
        if (persistedDrafts.length === 0) persistedDrafts = generatedDrafts.map((draft) => ({ ...draft }))
        return jsonResponse({ status: 'law_draft_ready', law_drafts: persistedDrafts })
      }

      if (url.includes('/matters/m-case01/law-drafts/publish') && method === 'POST') {
        if (persistedDrafts.some((draft) => !['accepted', 'ignored'].includes(draft.review_status))) {
          return jsonResponse({ error: 'invalid_review_status' }, 409)
        }
        formalLaws = persistedDrafts
          .filter((draft) => draft.review_status === 'accepted')
          .map((draft, index) => ({
            law_id: `law-${index + 1}`,
            matter_id: 'm-case01',
            title: draft.title,
            citation: draft.citation,
            issue_id: draft.source_issue_ids?.[0],
            description: [
              `规则内容：${draft.rule_content}`,
              `本案适用说明：${draft.application}`,
              `限制与风险：${draft.limitations}`,
              `AI判断：${draft.ai_reasoning}`,
            ].join('\n'),
          }))
        persistedDrafts = persistedDrafts.map((draft, index) => draft.review_status !== 'accepted'
          ? draft
          : { ...draft, published_law_id: `law-${index + 1}`, published_at: new Date().toISOString() })
        return jsonResponse({ status: 'laws_published', created_laws: formalLaws, ignored_count: 1, links_count: 1 })
      }

      if (url.includes('/matters/m-case01/law-drafts/') && method === 'PATCH') {
        const draftId = url.split('/law-drafts/')[1]
        const body = JSON.parse(String(init?.body || '{}'))
        const index = persistedDrafts.findIndex((draft) => draft.id === draftId)
        persistedDrafts[index] = {
          ...persistedDrafts[index],
          ...body,
          review_status: body.title || body.citation || body.rule_content || body.application || body.limitations || body.jurisdiction || body.source_reference
            ? 'edited'
            : body.review_status,
        }
        return jsonResponse(persistedDrafts[index])
      }

      if (url.includes('/matters/m-case01/law-drafts')) {
        return jsonResponse({ law_drafts: persistedDrafts })
      }

      return jsonResponse({})
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('auto-generates persisted law drafts and removes old buttons', async () => {
    render(<LawsPage />)

    await waitFor(() => expect(screen.getByText('民间借贷合同成立规则')).toBeTruthy())
    expect(screen.queryByText('新建法规')).toBeNull()
    expect(screen.queryByText('AI 推荐法律依据')).toBeNull()
    expect(screen.queryByText('全部接受')).toBeNull()
    expect(screen.queryByText('AI 建议')).toBeNull()
    expect(screen.getByText('请先完成法律依据草稿审核。')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'AI 继续工作' }).some((button) => button.hasAttribute('disabled'))).toBe(true)
    expect((global as any).fetch).toHaveBeenCalledWith(expect.stringContaining('/law-drafts/generate'), expect.objectContaining({ method: 'POST' }))
  })

  it('restores persisted drafts on refresh without generating again', async () => {
    persistedDrafts = generatedDrafts.map((draft) => ({ ...draft }))

    render(<LawsPage />)

    await waitFor(() => expect(screen.getByText('民间借贷合同成立规则')).toBeTruthy())
    expect((global as any).fetch.mock.calls.some((call: any[]) => String(call[0]).includes('/law-drafts/generate'))).toBe(false)
  })

  it('accepts edits ignores and publishes reviewed drafts', async () => {
    persistedDrafts = generatedDrafts.map((draft) => ({ ...draft }))
    render(<LawsPage />)

    await waitFor(() => expect(screen.getByText('民间借贷合同成立规则')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: '接受' })[0])
    await waitFor(() => expect(persistedDrafts[0].review_status).toBe('accepted'))

    fireEvent.click(screen.getAllByRole('button', { name: '修改' })[1])
    fireEvent.change(screen.getByDisplayValue('借款实际交付证明规则'), { target: { value: '经律师修改的借款实际交付证明规则' } })
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }))
    await waitFor(() => expect(persistedDrafts[1].review_status).toBe('edited'))
    fireEvent.click(screen.getAllByRole('button', { name: '接受' })[1])
    await waitFor(() => expect(persistedDrafts[1].review_status).toBe('accepted'))

    fireEvent.click(screen.getAllByRole('button', { name: '忽略' })[2])
    await waitFor(() => expect(persistedDrafts[2].review_status).toBe('ignored'))

    expect(screen.queryByRole('button', { name: '发布法律依据' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '发布法律依据' }))

    await waitFor(() => expect(screen.getByText('经律师修改的借款实际交付证明规则')).toBeTruthy())
    expect(formalLaws).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'AI 继续工作' }).some((button) => button.hasAttribute('disabled'))).toBe(false)
  })
})
