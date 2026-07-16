import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import IssuesPage from '../src/app/matters/[matter_id]/issues/page'

let pushMock = vi.fn()
let persistedDrafts: any[] = []
let formalIssues: any[] = []

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
  { fact_id: 'fact-1', title: '双方存在借贷合意', status: 'active' },
  { fact_id: 'fact-2', title: '借款资金已经交付', status: 'active' },
  { fact_id: 'fact-3', title: '债务到期后未清偿', status: 'active' },
].map((item) => ({ ...item, matter_id: 'm-case01' }))

const generatedDrafts = [
  {
    id: 'id-1',
    title: '双方是否成立民间借贷法律关系',
    description: '该争点影响请求权基础是否成立。',
    source_fact_ids: ['fact-1'],
    ai_reasoning: '借贷合意事实决定民间借贷关系是否成立。',
    confidence: 0.91,
    review_status: 'pending',
  },
  {
    id: 'id-2',
    title: '出借人是否已经完成借款交付义务',
    description: '该争点影响借款本金请求能否获得支持。',
    source_fact_ids: ['fact-2'],
    ai_reasoning: '资金交付是民间借贷关系实际履行的重要判断。',
    confidence: 0.9,
    review_status: 'pending',
  },
  {
    id: 'id-3',
    title: '借款人是否构成到期未还的违约',
    description: '该争点影响还款责任和逾期责任。',
    source_fact_ids: ['fact-3'],
    ai_reasoning: '到期未清偿事实决定违约责任是否成立。',
    confidence: 0.89,
    review_status: 'pending',
  },
].map((draft) => ({ ...draft, matter_id: 'm-case01', published_issue_id: null, published_at: null }))

describe('Issues Draft Workflow', () => {
  beforeEach(() => {
    pushMock = vi.fn()
    persistedDrafts = []
    formalIssues = []
    ;(global as any).fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = String(init?.method || 'GET').toUpperCase()

      if (url.includes('/matters/m-case01/facts')) {
        return jsonResponse(facts)
      }

      if (url.includes('/matters/m-case01/issues') && !url.includes('issue-drafts')) {
        return jsonResponse(formalIssues)
      }

      if (url.includes('/matters/m-case01/issue-drafts/generate') && method === 'POST') {
        if (persistedDrafts.length === 0) persistedDrafts = generatedDrafts.map((draft) => ({ ...draft }))
        return jsonResponse({ status: 'issue_draft_ready', issue_drafts: persistedDrafts })
      }

      if (url.includes('/matters/m-case01/issue-drafts/publish') && method === 'POST') {
        if (persistedDrafts.some((draft) => !['accepted', 'ignored'].includes(draft.review_status))) {
          return jsonResponse({ error: 'invalid_review_status' }, 409)
        }
        formalIssues = persistedDrafts
          .filter((draft) => draft.review_status === 'accepted')
          .map((draft, index) => ({
            issue_id: `iss-${index + 1}`,
            matter_id: 'm-case01',
            title: draft.title,
            description: draft.description,
            status: 'active',
          }))
        persistedDrafts = persistedDrafts.map((draft, index) => draft.review_status !== 'accepted'
          ? draft
          : { ...draft, published_issue_id: `iss-${index + 1}`, published_at: new Date().toISOString() })
        return jsonResponse({ status: 'issues_published', created_issues: formalIssues, ignored_count: 1, links_count: 2 })
      }

      if (url.includes('/matters/m-case01/issue-drafts/') && method === 'PATCH') {
        const draftId = url.split('/issue-drafts/')[1]
        const body = JSON.parse(String(init?.body || '{}'))
        const index = persistedDrafts.findIndex((draft) => draft.id === draftId)
        persistedDrafts[index] = {
          ...persistedDrafts[index],
          ...body,
          review_status: body.title || body.description ? 'edited' : body.review_status,
        }
        return jsonResponse(persistedDrafts[index])
      }

      if (url.includes('/matters/m-case01/issue-drafts')) {
        return jsonResponse(persistedDrafts)
      }

      return jsonResponse({})
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('auto-generates persisted issue drafts and removes old buttons', async () => {
    render(<IssuesPage />)

    await waitFor(() => expect(screen.getByText('双方是否成立民间借贷法律关系')).toBeTruthy())
    expect(screen.queryByText('新建议题')).toBeNull()
    expect(screen.queryByText('AI 提炼争议焦点')).toBeNull()
    expect(screen.queryByText('全部接受')).toBeNull()
    expect(screen.queryByText('下一步：查找适用法律')).toBeNull()
    expect(screen.getByText('请先完成全部争议焦点草稿审核。')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'AI 继续工作' }).some((button) => button.hasAttribute('disabled'))).toBe(true)
    expect((global as any).fetch).toHaveBeenCalledWith(expect.stringContaining('/issue-drafts/generate'), expect.objectContaining({ method: 'POST' }))
  })

  it('restores persisted drafts on refresh without generating again', async () => {
    persistedDrafts = generatedDrafts.map((draft) => ({ ...draft }))

    render(<IssuesPage />)

    await waitFor(() => expect(screen.getByText('双方是否成立民间借贷法律关系')).toBeTruthy())
    expect((global as any).fetch.mock.calls.some((call: any[]) => String(call[0]).includes('/issue-drafts/generate'))).toBe(false)
  })

  it('accepts edits ignores and publishes reviewed drafts', async () => {
    persistedDrafts = generatedDrafts.map((draft) => ({ ...draft }))
    render(<IssuesPage />)

    await waitFor(() => expect(screen.getByText('双方是否成立民间借贷法律关系')).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: '接受' })[0])
    await waitFor(() => expect(persistedDrafts[0].review_status).toBe('accepted'))

    fireEvent.click(screen.getAllByRole('button', { name: '修改' })[1])
    fireEvent.change(screen.getByDisplayValue('出借人是否已经完成借款交付义务'), { target: { value: '出借人是否已完成全部借款交付义务' } })
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }))
    await waitFor(() => expect(persistedDrafts[1].review_status).toBe('edited'))
    fireEvent.click(screen.getAllByRole('button', { name: '接受' })[1])
    await waitFor(() => expect(persistedDrafts[1].review_status).toBe('accepted'))

    fireEvent.click(screen.getAllByRole('button', { name: '忽略' })[2])
    await waitFor(() => expect(persistedDrafts[2].review_status).toBe('ignored'))

    expect(screen.getByRole('button', { name: '发布争议焦点' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '发布争议焦点' }))

    await waitFor(() => expect(screen.getByText('出借人是否已完成全部借款交付义务')).toBeTruthy())
    expect(formalIssues).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'AI 继续工作' }).some((button) => button.hasAttribute('disabled'))).toBe(false)
  })
})
