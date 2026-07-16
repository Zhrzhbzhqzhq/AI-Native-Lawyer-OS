import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReportPage from '../src/app/intake/report/page'

let pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: (...args: any[]) => pushMock(...args) }),
}))

function mockStorage(draft: any, analysis: any) {
  sessionStorage.setItem('new_matter_draft', JSON.stringify(draft))
  sessionStorage.setItem('lawdesk_intake_uploaded_files', JSON.stringify([
    { name: '001_客户咨询记录.md', size: 100, type: 'text/markdown', upload_time: new Date().toISOString(), content: '出借人张建国，借款人李海涛，民间借贷纠纷。' },
  ]))
  sessionStorage.setItem('intake_analysis', JSON.stringify(analysis))
}

describe('Intake report matter draft confirmation', () => {
  beforeEach(() => {
    pushMock = vi.fn()
    sessionStorage.clear()
    ;(global as any).fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('uses extracted matter_draft when creating Matter', async () => {
    mockStorage(
      { caseName: '', client: '', opponent: '', caseType: '' },
      {
        status: 'analysis_ready',
        analysis: {
          matter_draft: {
            title: '张建国诉李海涛民间借贷纠纷',
            client: '张建国',
            opponent: '李海涛',
            matter_type: '民间借贷纠纷',
            confidence: { title: 0.9, client: 0.9, opponent: 0.9, matter_type: 0.9 },
          },
          next_actions: [],
        },
      },
    )
    ;(global as any).fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ matter_id: 'm-created' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ created_materials: [{}] }) })

    render(<ReportPage />)
    fireEvent.click(screen.getByRole('button', { name: '确认建立案件' }))

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledTimes(2))
    const createBody = JSON.parse((global as any).fetch.mock.calls[0][1].body)
    expect(createBody.title).toBe('张建国诉李海涛民间借贷纠纷')
    expect(createBody.matter_type).toBe('民间借贷纠纷')
  })

  it('falls back to manually entered draft when matter_draft is absent', async () => {
    mockStorage(
      { caseName: '手填案件', client: '手填委托人', opponent: '手填对方', caseType: '合同纠纷' },
      { status: 'analysis_ready', analysis: { next_actions: [] } },
    )
    ;(global as any).fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ matter_id: 'm-created' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ created_materials: [{}] }) })

    render(<ReportPage />)
    fireEvent.click(screen.getByRole('button', { name: '确认建立案件' }))

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledTimes(2))
    const createBody = JSON.parse((global as any).fetch.mock.calls[0][1].body)
    expect(createBody.title).toBe('手填案件')
    expect(createBody.matter_type).toBe('合同纠纷')
  })
})
