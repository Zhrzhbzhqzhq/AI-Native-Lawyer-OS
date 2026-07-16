import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FactsPage from '../src/app/matters/[matter_id]/facts/page'

let pushMock = vi.fn()
let persistedDrafts: any[] = []
let formalFacts: any[] = []

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

const evidences = [
  { evidence_id: 'ev-1', title: '借贷合意证据', status: 'active' },
  { evidence_id: 'ev-2', title: '借款资金交付证据', status: 'active' },
  { evidence_id: 'ev-3', title: '到期未还与催收证据', status: 'active' },
].map((item) => ({ ...item, matter_id: 'm-case01' }))

const generatedDrafts = [
  {
    draft_id: 'fd-1',
    title: '双方存在借贷合意',
    description: '借条与聊天记录证明双方达成借贷合意。',
    source_evidence_ids: ['ev-1'],
    ai_reasoning: '借贷合意证据可以证明借款关系成立。',
    confidence: 0.86,
    review_status: 'pending',
  },
  {
    draft_id: 'fd-2',
    title: '借款资金已经交付',
    description: '银行流水与借条相互印证资金交付。',
    source_evidence_ids: ['ev-2'],
    ai_reasoning: '资金交付证据可以证明款项实际支付。',
    confidence: 0.88,
    review_status: 'pending',
  },
  {
    draft_id: 'fd-3',
    title: '债务到期后未清偿',
    description: '催收证据显示到期后仍未还款。',
    source_evidence_ids: ['ev-3'],
    ai_reasoning: '催收记录可以证明到期未还。',
    confidence: 0.84,
    review_status: 'pending',
  },
].map((draft) => ({ ...draft, matter_id: 'm-case01', published_fact_id: null, published_at: null }))

describe('Facts Draft Workflow', () => {
  beforeEach(() => {
    pushMock = vi.fn()
    persistedDrafts = []
    formalFacts = []
    ;(global as any).fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = String(init?.method || 'GET').toUpperCase()

      if (url.includes('/matters/m-case01/evidence')) {
        return jsonResponse(evidences)
      }

      if (url.includes('/matters/m-case01/facts') && !url.includes('fact-drafts')) {
        return jsonResponse(formalFacts)
      }

      if (url.includes('/matters/m-case01/fact-drafts/generate') && method === 'POST') {
        if (persistedDrafts.length === 0) persistedDrafts = generatedDrafts.map((draft) => ({ ...draft }))
        return jsonResponse({ status: 'fact_draft_ready', fact_drafts: persistedDrafts })
      }

      if (url.includes('/matters/m-case01/fact-drafts/publish') && method === 'POST') {
        if (persistedDrafts.some((draft) => !['accepted', 'ignored'].includes(draft.review_status))) {
          return jsonResponse({ error: 'invalid_review_status' }, 409)
        }
        formalFacts = persistedDrafts
          .filter((draft) => draft.review_status === 'accepted')
          .map((draft, index) => ({
            fact_id: `fact-${index + 1}`,
            matter_id: 'm-case01',
            title: draft.title,
            description: draft.description,
            status: 'active',
          }))
        persistedDrafts = persistedDrafts.map((draft, index) => draft.review_status !== 'accepted'
          ? draft
          : { ...draft, published_fact_id: `fact-${index + 1}`, published_at: new Date().toISOString() })
        return jsonResponse({ status: 'facts_published', created_facts: formalFacts, ignored_count: 1, links_count: 2 })
      }

      if (url.includes('/matters/m-case01/fact-drafts/') && method === 'PATCH') {
        const draftId = url.split('/fact-drafts/')[1]
        const body = JSON.parse(String(init?.body || '{}'))
        const index = persistedDrafts.findIndex((draft) => draft.draft_id === draftId)
        persistedDrafts[index] = {
          ...persistedDrafts[index],
          ...body,
          review_status: body.title || body.description ? 'edited' : body.review_status,
        }
        return jsonResponse(persistedDrafts[index])
      }

      if (url.includes('/matters/m-case01/fact-drafts')) {
        return jsonResponse(persistedDrafts)
      }

      return jsonResponse({})
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('auto-generates persisted Facts Drafts and removes old manual buttons', async () => {
    render(<FactsPage />)

    await waitFor(() => expect(screen.getByText('双方存在借贷合意')).toBeTruthy())
    expect(screen.queryByText('根据所选证据创建事实')).toBeNull()
    expect(screen.queryByText('AI 整理事实')).toBeNull()
    expect(screen.queryByText('全部接受')).toBeNull()
    expect(screen.getByText('请先完成全部事实草稿审核。')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'AI 继续工作' }).some((button) => button.hasAttribute('disabled'))).toBe(true)
    expect((global as any).fetch).toHaveBeenCalledWith(expect.stringContaining('/fact-drafts/generate'), expect.objectContaining({ method: 'POST' }))
  })

  it('restores persisted drafts on refresh without generating again', async () => {
    persistedDrafts = generatedDrafts.map((draft) => ({ ...draft }))

    render(<FactsPage />)

    await waitFor(() => expect(screen.getByText('双方存在借贷合意')).toBeTruthy())
    expect((global as any).fetch.mock.calls.some((call: any[]) => String(call[0]).includes('/fact-drafts/generate'))).toBe(false)
  })

  it('accepts edits ignores and publishes reviewed drafts', async () => {
    persistedDrafts = generatedDrafts.map((draft) => ({ ...draft }))
    render(<FactsPage />)

    await waitFor(() => expect(screen.getByText('双方存在借贷合意')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: '接受' })[0])
    await waitFor(() => expect(persistedDrafts[0].review_status).toBe('accepted'))

    fireEvent.click(screen.getAllByRole('button', { name: '修改' })[1])
    fireEvent.change(screen.getByDisplayValue('借款资金已经交付'), { target: { value: '借款资金已通过银行转账交付' } })
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }))
    await waitFor(() => expect(persistedDrafts[1].review_status).toBe('edited'))
    fireEvent.click(screen.getAllByRole('button', { name: '接受' })[1])
    await waitFor(() => expect(persistedDrafts[1].review_status).toBe('accepted'))

    fireEvent.click(screen.getAllByRole('button', { name: '忽略' })[2])
    await waitFor(() => expect(persistedDrafts[2].review_status).toBe('ignored'))

    expect(screen.getByRole('button', { name: '发布事实' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '发布事实' }))

    await waitFor(() => expect(screen.getByText('借款资金已通过银行转账交付')).toBeTruthy())
    expect(formalFacts).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'AI 继续工作' }).some((button) => button.hasAttribute('disabled'))).toBe(false)
  })
})
