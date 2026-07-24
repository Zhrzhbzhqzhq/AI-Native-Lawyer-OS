import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentsPage from '../src/app/matters/[matter_id]/documents/page'

let pushMock = vi.fn()
let drafts: any[] = []
let documents: any[] = []
let regenerateStatus = 'generated'

vi.mock('next/navigation', () => ({
  useParams: () => ({ matter_id: 'm-case01' }),
  useRouter: () => ({ push: (...args: any[]) => pushMock(...args) }),
}))

function jsonResponse(body: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

const facts = [{ fact_id: 'fact-1', title: '借款已经实际交付' }]
const issues = [{ issue_id: 'issue-1', title: '出借人是否完成借款交付义务' }]
const laws = [{ law_id: 'law-1', title: '民间借贷合同规则' }]
const args = [{ argument_id: 'arg-1', title: '被告应偿还借款本金', conclusion: '请求支持还款。' }]
const generatedDraft = {
  id: 'doc-draft-1',
  matter_id: 'm-case01',
  document_type: 'complaint',
  title: '张建国诉李海涛民间借贷纠纷民事起诉状',
  content: '民事起诉状\n\n诉讼请求：请求偿还借款。\n事实与理由：借款已经实际交付。',
  source_argument_ids: ['arg-1'],
  source_fact_ids: ['fact-1'],
  source_issue_ids: ['issue-1'],
  source_law_ids: ['law-1'],
  confidence: 0.86,
  ai_reasoning: '基于正式办案成果生成。',
  review_status: 'generated',
}

describe('Documents Draft Workflow', () => {
  beforeEach(() => {
    pushMock = vi.fn()
    drafts = []
    documents = []
    regenerateStatus = 'generated'
    ;(global as any).fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = String(init?.method || 'GET').toUpperCase()

      if (url.includes('/document-drafts/generate') && method === 'POST') {
        if (drafts.length === 0) drafts = [{ ...generatedDraft }]
        return jsonResponse({ status: 'document_draft_ready', document_draft: drafts[0], idempotent: false })
      }

      if (url.includes('/document-drafts/doc-draft-1/regenerate') && method === 'POST') {
        drafts[0] = { ...drafts[0], content: `${drafts[0].content}\n律师意见已纳入。`, review_status: regenerateStatus }
        return jsonResponse(drafts[0])
      }

      if (url.includes('/document-drafts/doc-draft-1/publish') && method === 'POST') {
        documents = [{
          document_id: 'doc-1',
          matter_id: 'm-case01',
          document_type: 'complaint',
          title: drafts[0].title,
          content: drafts[0].content,
          status: 'published',
        }]
        drafts[0] = { ...drafts[0], review_status: 'published', published_document_id: 'doc-1', published_at: new Date().toISOString() }
        return jsonResponse({ status: 'document_published', matter_id: 'm-case01', document: documents[0] })
      }

      if (url.includes('/document-drafts/doc-draft-1') && method === 'PATCH') {
        const body = JSON.parse(String(init?.body || '{}'))
        drafts[0] = { ...drafts[0], ...body, review_status: body.review_status || 'editing' }
        return jsonResponse(drafts[0])
      }

      if (url.includes('/document-drafts')) return jsonResponse({ document_drafts: drafts.map((draft) => ({ ...draft })) })
      if (url.includes('/arguments')) return jsonResponse(args)
      if (url.includes('/facts')) return jsonResponse(facts)
      if (url.includes('/issues')) return jsonResponse(issues)
      if (url.includes('/laws')) return jsonResponse(laws)
      if (url.includes('/materials')) return jsonResponse([{ material_id: 'mat-1' }])
      if (url.includes('/evidence')) return jsonResponse([{ evidence_id: 'ev-1' }])
      if (url.includes('/documents/doc-1') && method === 'PATCH') {
        const body = JSON.parse(String(init?.body || '{}'))
        documents[0] = { ...documents[0], ...body }
        return jsonResponse(documents[0])
      }
      if (url.includes('/documents')) return jsonResponse(documents)
      return jsonResponse({})
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses document draft workflow and removes legacy document creation UI', async () => {
    render(<DocumentsPage />)

    await waitFor(() => expect(screen.getByText('AI 生成文书草稿')).toBeTruthy())
    expect(screen.queryByText('新建文书')).toBeNull()
    expect(screen.queryByText('AI 建议')).toBeNull()
    expect(screen.queryByText('全部接受')).toBeNull()

    fireEvent.click(screen.getByText('AI 生成文书草稿'))
    await waitFor(() => expect(screen.getByDisplayValue(generatedDraft.title)).toBeTruthy())
    expect((global as any).fetch).toHaveBeenCalledWith(expect.stringContaining('/document-drafts/generate'), expect.objectContaining({ method: 'POST' }))
    expect((global as any).fetch.mock.calls.some((call: any[]) => String(call[0]).endsWith('/documents') && call[1]?.method === 'POST')).toBe(false)
  })

  it('restores persisted draft edits regenerates publishes and exposes Word export', async () => {
    drafts = [{ ...generatedDraft }]
    render(<DocumentsPage />)

    await waitFor(() => expect(screen.getByDisplayValue(generatedDraft.title)).toBeTruthy())
    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: `${generatedDraft.content}\n律师修改。` } })
    fireEvent.click(screen.getByText('保存草稿'))
    await waitFor(() => expect(drafts[0].content).toContain('律师修改'))

    fireEvent.change(screen.getByPlaceholderText('可填写需要 AI 重写或补强的意见'), { target: { value: '强化诉讼请求' } })
    fireEvent.click(screen.getByText('根据律师意见重新生成'))
    await waitFor(() => expect(drafts[0].content).toContain('律师意见已纳入'))

    fireEvent.click(screen.getByText('标记可发布'))
    await waitFor(() => expect(drafts[0].review_status).toBe('ready_to_publish'))
    await waitFor(() => expect(screen.getByRole('button', { name: '发布正式文书' }).hasAttribute('disabled')).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: '发布正式文书' }))

    await waitFor(() => expect(screen.getByText('正式文书')).toBeTruthy())
    expect(documents).toHaveLength(1)
    expect(screen.getByText('导出 Word')).toBeTruthy()
  })

  it('accepts editing as a successful regenerate status and refreshes the draft', async () => {
    regenerateStatus = 'editing'
    drafts = [{ ...generatedDraft }]
    const regeneratedContent = `${generatedDraft.content}\n律师意见已纳入。`
    render(<DocumentsPage />)

    await waitFor(() => expect(screen.getByDisplayValue(generatedDraft.title)).toBeTruthy())
    fireEvent.click(screen.getByText('根据律师意见重新生成'))

    await waitFor(() => expect(screen.getByText('已根据律师意见重新生成')).toBeTruthy())
    expect(drafts[0].content).toContain('律师意见已纳入')
    expect(drafts[0].review_status).toBe('editing')
    await waitFor(() => expect((screen.getAllByRole('textbox')[1] as HTMLTextAreaElement).value).toBe(regeneratedContent))
    expect(screen.queryByText('文书草稿返回数据暂不可用')).toBeNull()
  })
})
