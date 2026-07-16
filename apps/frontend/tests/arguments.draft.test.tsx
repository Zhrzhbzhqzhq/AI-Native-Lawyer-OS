import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ArgumentsPage from '../src/app/matters/[matter_id]/arguments/page'

let pushMock = vi.fn()
let persistedDrafts: any[] = []
let formalArguments: any[] = []

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

const facts = [
  { fact_id: 'fact-1', title: '借贷合意已形成', description: '借条和聊天记录可证明。' },
  { fact_id: 'fact-2', title: '借款资金已经交付', description: '银行流水可证明。' },
  { fact_id: 'fact-3', title: '债务到期后仍未清偿', description: '催收记录可证明。' },
].map((item) => ({ ...item, matter_id: 'm-case01' }))

const issues = [
  { issue_id: 'issue-1', title: '双方是否成立民间借贷关系', description: '判断请求权基础。' },
  { issue_id: 'issue-2', title: '出借人是否完成交付义务', description: '判断本金请求。' },
].map((item) => ({ ...item, matter_id: 'm-case01' }))

const laws = [
  { law_id: 'law-1', title: '民间借贷合同成立规则', citation: '民法典第六百六十七条' },
  { law_id: 'law-2', title: '借款交付证明规则', citation: '民间借贷司法解释第二条' },
].map((item) => ({ ...item, matter_id: 'm-case01' }))

const generatedDrafts = [
  {
    id: 'arg-draft-1',
    title: '民间借贷关系成立的论证',
    position: '双方已成立合法有效的民间借贷关系。',
    reasoning: '借条、聊天记录和咨询记录共同证明借贷合意。',
    counter_argument: '对方可能主张款项属于其他交易。',
    response: '借条与银行流水可以相互印证。',
    risk: '资金用途仍可能被争议。',
    conclusion: '请求法院确认借贷关系成立。',
    source_fact_ids: ['fact-1'],
    source_issue_ids: ['issue-1'],
    source_law_ids: ['law-1'],
    ai_reasoning: '该论证基于正式事实、争议焦点和法律依据。',
    confidence: 0.93,
    review_status: 'pending',
  },
  {
    id: 'arg-draft-2',
    title: '借款交付完成的论证',
    position: '出借人已经完成借款交付义务。',
    reasoning: '银行流水与借条金额相互对应。',
    counter_argument: '对方可能否认流水性质。',
    response: '结合借条和聊天记录说明款项性质。',
    risk: '需核对流水收款账户。',
    conclusion: '请求法院认定本金已经实际交付。',
    source_fact_ids: ['fact-2'],
    source_issue_ids: ['issue-2'],
    source_law_ids: ['law-2'],
    ai_reasoning: '该论证回应交付义务争议。',
    confidence: 0.91,
    review_status: 'pending',
  },
].map((draft) => ({ ...draft, matter_id: 'm-case01', published_argument_id: null, published_at: null }))

describe('Argument Draft Workflow', () => {
  beforeEach(() => {
    pushMock = vi.fn()
    persistedDrafts = []
    formalArguments = []
    ;(global as any).fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = String(init?.method || 'GET').toUpperCase()

      if (url.includes('/matters/m-case01/facts')) return jsonResponse(facts)
      if (url.includes('/matters/m-case01/issues')) return jsonResponse(issues)
      if (url.includes('/matters/m-case01/laws')) return jsonResponse(laws)
      if (url.includes('/matters/m-case01/arguments') && !url.includes('argument-drafts')) return jsonResponse(formalArguments)

      if (url.includes('/matters/m-case01/argument-drafts/generate') && method === 'POST') {
        if (persistedDrafts.length === 0) persistedDrafts = generatedDrafts.map((draft) => ({ ...draft }))
        return jsonResponse({ status: 'argument_draft_ready', argument_drafts: persistedDrafts })
      }

      if (url.includes('/matters/m-case01/argument-drafts/publish') && method === 'POST') {
        if (persistedDrafts.some((draft) => !['accepted', 'ignored'].includes(draft.review_status))) return jsonResponse({ error: 'invalid_review_status' }, 409)
        formalArguments = persistedDrafts
          .filter((draft) => draft.review_status === 'accepted')
          .map((draft, index) => ({
            argument_id: `arg-${index + 1}`,
            matter_id: 'm-case01',
            title: draft.title,
            description: draft.reasoning,
            conclusion: draft.conclusion,
          }))
        persistedDrafts = persistedDrafts.map((draft, index) => draft.review_status !== 'accepted' ? draft : { ...draft, published_argument_id: `arg-${index + 1}`, published_at: new Date().toISOString() })
        return jsonResponse({ status: 'arguments_published', created_arguments: formalArguments, argument_fact_links: 1, argument_issue_links: 1, argument_law_links: 1, ignored_count: 1 })
      }

      if (url.includes('/matters/m-case01/argument-drafts/') && method === 'PATCH') {
        const draftId = url.split('/argument-drafts/')[1]
        const body = JSON.parse(String(init?.body || '{}'))
        const index = persistedDrafts.findIndex((draft) => draft.id === draftId)
        persistedDrafts[index] = {
          ...persistedDrafts[index],
          ...body,
          review_status: body.title || body.position || body.reasoning || body.counter_argument || body.response || body.risk || body.conclusion
            ? 'edited'
            : body.review_status,
        }
        return jsonResponse(persistedDrafts[index])
      }

      if (url.includes('/matters/m-case01/argument-drafts')) return jsonResponse({ argument_drafts: persistedDrafts })
      return jsonResponse({})
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('auto-generates persisted argument drafts and removes old buttons', async () => {
    render(<ArgumentsPage />)

    await waitFor(() => expect(screen.getByText('民间借贷关系成立的论证')).toBeTruthy())
    expect(screen.queryByText('新建论点')).toBeNull()
    expect(screen.queryByText('AI 组织法律论证')).toBeNull()
    expect(screen.queryByText('全部接受')).toBeNull()
    expect(screen.queryByText('AI 建议')).toBeNull()
    expect(screen.getByText('请先完成法律论证草稿审核。')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'AI 继续工作' }).some((button) => button.hasAttribute('disabled'))).toBe(true)
    expect((global as any).fetch).toHaveBeenCalledWith(expect.stringContaining('/argument-drafts/generate'), expect.objectContaining({ method: 'POST' }))
  })

  it('restores persisted drafts on refresh without generating again', async () => {
    persistedDrafts = generatedDrafts.map((draft) => ({ ...draft }))

    render(<ArgumentsPage />)

    await waitFor(() => expect(screen.getByText('民间借贷关系成立的论证')).toBeTruthy())
    expect((global as any).fetch.mock.calls.some((call: any[]) => String(call[0]).includes('/argument-drafts/generate'))).toBe(false)
  })

  it('accepts edits ignores and publishes reviewed drafts', async () => {
    persistedDrafts = generatedDrafts.map((draft) => ({ ...draft }))
    render(<ArgumentsPage />)

    await waitFor(() => expect(screen.getByText('民间借贷关系成立的论证')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: '接受' })[0])
    await waitFor(() => expect(persistedDrafts[0].review_status).toBe('accepted'))

    fireEvent.click(screen.getAllByRole('button', { name: '修改' })[1])
    fireEvent.change(screen.getByDisplayValue('借款交付完成的论证'), { target: { value: '经律师修改的借款交付完成论证' } })
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }))
    await waitFor(() => expect(persistedDrafts[1].review_status).toBe('edited'))
    fireEvent.click(screen.getAllByRole('button', { name: '接受' })[1])
    await waitFor(() => expect(persistedDrafts[1].review_status).toBe('accepted'))

    expect(screen.queryByRole('button', { name: '发布法律论证' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '发布法律论证' }))

    await waitFor(() => expect(screen.getByText('经律师修改的借款交付完成论证')).toBeTruthy())
    expect(formalArguments).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'AI 继续工作' }).some((button) => button.hasAttribute('disabled'))).toBe(false)
  })
})
