import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EvidencePage from '../src/app/matters/[matter_id]/evidence/page'

let pushMock = vi.fn()
let confirmedEvidence: any[] = []

vi.mock('next/navigation', () => ({
  useParams: () => ({ matter_id: 'm-case01' }),
  useRouter: () => ({ push: (...args: any[]) => pushMock(...args) }),
}))

function jsonResponse(body: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

describe('Evidence Draft Workflow', () => {
  beforeEach(() => {
    pushMock = vi.fn()
    confirmedEvidence = []
    ;(global as any).fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = String(init?.method || 'GET').toUpperCase()

      if (url.includes('/intake/evidence-draft')) {
        return jsonResponse({
          status: 'evidence_draft_ready',
          matter_id: 'm-case01',
          evidence_drafts: [
            {
              draft_id: 'draft-1',
              material_id: 'mat-1',
              title: '借贷合意证据',
              evidence_type: 'document',
              proof_purpose: '证明借贷关系成立',
              source_material_ids: ['mat-1', 'mat-2'],
              materials: [{ material_id: 'mat-1', title: '001_客户咨询记录.md' }, { material_id: 'mat-2', title: '005_借条.md' }],
              summary: '客户咨询记录显示借款合意和催收经过。',
              reasoning: '该材料可辅助证明双方形成借贷关系。',
              confidence: 0.8,
              source: 'client',
              suggested_action: 'confirm_as_evidence',
            },
            {
              draft_id: 'draft-2',
              material_id: 'mat-2',
              title: '借款资金交付证据',
              evidence_type: 'document',
              proof_purpose: '证明出借人已实际支付借款',
              source_material_ids: ['mat-2'],
              materials: [{ material_id: 'mat-2', title: '005_借条.md' }],
              summary: '借条载明金额、借款人和还款期限。',
              reasoning: '该材料可直接证明债权核心事实。',
              confidence: 0.8,
              source: 'client',
              suggested_action: 'confirm_as_evidence',
            },
            {
              draft_id: 'draft-3',
              material_id: 'mat-2',
              title: '到期未还与催收证据',
              evidence_type: 'document',
              proof_purpose: '证明债务到期后借款人未按约还款',
              source_material_ids: ['mat-2'],
              materials: [{ material_id: 'mat-2', title: '005_借条.md' }],
              summary: '催收材料显示到期后仍未还款。',
              reasoning: '到期约定和催收记录共同证明违约事实。',
              confidence: 0.82,
              source: 'client',
              suggested_action: 'confirm_as_evidence',
            },
          ],
        })
      }

      if (url.includes('/intake/confirm-evidence') && method === 'POST') {
        const body = JSON.parse(String(init?.body || '{}'))
        const drafts = body.evidence_drafts || []
        const created = drafts.map((draft: any) => ({ ...draft, evidence_id: `ev-${draft.draft_id}`, matter_id: 'm-case01' }))
        confirmedEvidence = [...confirmedEvidence, ...created]
        return jsonResponse({ status: 'evidence_created', matter_id: 'm-case01', created_evidence: created })
      }

      if (url.includes('/matters/m-case01/materials')) {
        return jsonResponse([
          { material_id: 'mat-1', title: '001_客户咨询记录.md', material_type: 'markdown', source: 'client', created_at: '2026-01-01T00:00:00Z' },
          { material_id: 'mat-2', title: '005_借条.md', material_type: 'markdown', source: 'client', created_at: '2026-01-01T00:00:00Z' },
        ])
      }

      if (url.includes('/matters/m-case01/evidence/workspace')) {
        return jsonResponse({
          matter_id: 'm-case01',
          matter: { matter_id: 'm-case01', title: 'Case01', status: 'active' },
          evidence_list: confirmedEvidence.map((draft) => ({
            evidence_id: `ev-${draft.draft_id}`,
            material_id: draft.material_id,
            title: draft.title,
            evidence_type: draft.evidence_type,
            description: draft.summary,
            display_description: draft.summary,
            proof_purpose: draft.proof_purpose,
            summary: draft.summary,
            reasoning: draft.reasoning,
            confidence: draft.confidence,
            source_materials: draft.materials,
            relevance: draft.proof_purpose,
            score: Math.round((draft.confidence || 0.8) * 100),
            status: 'active',
          })),
          graph: { nodes: [], links: [] },
          proof_goal: '',
          proof_map: { nodes: [], links: [] },
          summary: { total: confirmedEvidence.length, accepted: 0, pending: confirmedEvidence.length, weak: 0, missing: 0 },
          navigation: { by_type: [], by_status: [], by_strength: [] },
          selected_evidence: null,
          materials: [
            { material_id: 'mat-1', title: '001_客户咨询记录.md', material_type: 'markdown', source: 'client' },
            { material_id: 'mat-2', title: '005_借条.md', material_type: 'markdown', source: 'client' },
          ],
          source_materials: [{ material_id: 'mat-1', title: '001_客户咨询记录.md' }],
          ai_analysis: { status: 'placeholder', message: 'analysis pending' },
          missing_evidence: [],
          evidence_next_steps: [],
          risks: [], strengths: [], suggestions: [], next_actions: [],
          score: 0, confidence: 0,
          timeline: [], discoveries: [],
        })
      }

      if (url.includes('/matters/m-case01/evidence')) {
        return jsonResponse(confirmedEvidence.map((draft) => ({
          evidence_id: draft.evidence_id,
          matter_id: 'm-case01',
          material_id: draft.material_id,
          title: draft.title,
          evidence_type: draft.evidence_type,
          description: draft.proof_purpose,
          relevance: draft.proof_purpose,
          status: 'active',
        })))
      }

      if (url.includes('/matters/m-case01/graph')) {
        return jsonResponse({ nodes: [], links: [] })
      }

      return jsonResponse({})
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('auto-generates evidence drafts and disables AI continuation before review', async () => {
    render(<EvidencePage />)

    await waitFor(() => expect(screen.getByText('证明借贷关系成立')).toBeTruthy())
    expect(screen.getByText('证明借贷关系成立')).toBeTruthy()
    expect(screen.getByText('来源材料：001_客户咨询记录.md、005_借条.md')).toBeTruthy()
    expect(screen.getByText('AI 摘要或判断理由：客户咨询记录显示借款合意和催收经过。')).toBeTruthy()
    expect(screen.queryByText('转为证据')).toBeNull()
    expect(screen.queryByText('证据整理功能将在下一步接入')).toBeNull()
    expect(screen.queryByText('AI evidence analysis coming soon')).toBeNull()
    expect(screen.getByText('请先完成证据草稿审核')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'AI 继续工作' }).some((button) => button.hasAttribute('disabled'))).toBe(true)
  })

  it('renders evidence drafts after loading under React StrictMode', async () => {
    render(
      <React.StrictMode>
        <EvidencePage />
      </React.StrictMode>,
    )

    await waitFor(() => expect(screen.getByText('借贷合意证据')).toBeTruthy())
    expect(screen.getByText('证明借贷关系成立')).toBeTruthy()
    expect(screen.queryByText('正在生成草稿…')).toBeNull()
  })

  it('persists accepted edited drafts and ignores ignored drafts', async () => {
    render(<EvidencePage />)

    await waitFor(() => expect(screen.getAllByRole('button', { name: '忽略' })).toHaveLength(3))
    fireEvent.click(screen.getAllByRole('button', { name: '忽略' })[1])
    fireEvent.click(screen.getAllByRole('button', { name: '修改' })[0])
    fireEvent.change(screen.getByDisplayValue('借贷合意证据'), { target: { value: '客户咨询记录证据' } })
    fireEvent.change(screen.getByDisplayValue('证明借贷关系成立'), { target: { value: '证明原被告之间存在借款合意' } })
    fireEvent.click(screen.getByRole('button', { name: '完成修改' }))
    fireEvent.click(screen.getAllByRole('button', { name: '接受' })[0])

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith(
      expect.stringContaining('/intake/confirm-evidence'),
      expect.objectContaining({ method: 'POST' }),
    ))

    const confirmCall = (global as any).fetch.mock.calls.find((call: any[]) => String(call[0]).includes('/intake/confirm-evidence'))
    const body = JSON.parse(confirmCall[1].body)
    expect(body.evidence_drafts).toHaveLength(1)
    expect(body.evidence_drafts[0].title).toBe('客户咨询记录证据')
    expect(body.evidence_drafts[0].proof_purpose).toBe('证明原被告之间存在借款合意')
    expect(body.evidence_drafts[0].material_id).toBe('mat-1')
    expect(body.evidence_drafts[0].source_material_ids).toEqual(['mat-1', 'mat-2'])
    expect(body.evidence_drafts[0].materials).toEqual([{ material_id: 'mat-1', title: '001_客户咨询记录.md' }, { material_id: 'mat-2', title: '005_借条.md' }])
    expect(body.evidence_drafts[0].description).toBe('客户咨询记录显示借款合意和催收经过。')
    expect(body.evidence_drafts[0].relevance).toBe('证明原被告之间存在借款合意')
    expect(body.evidence_drafts[0].confidence).toBe(0.8)
  })

  it('keeps remaining drafts visible after each accept and publishes every accepted draft', async () => {
    render(<EvidencePage />)
    const clickNextAccept = () => {
      const next = screen.getAllByRole('button', { name: '接受' }).find((button) => !button.hasAttribute('disabled'))
      expect(next).toBeTruthy()
      fireEvent.click(next as HTMLElement)
    }

    await waitFor(() => expect(screen.getByText('借贷合意证据')).toBeTruthy())
    expect(screen.getAllByRole('button', { name: 'AI 继续工作' }).some((button) => button.hasAttribute('disabled'))).toBe(true)

    clickNextAccept()
    await waitFor(() => expect(confirmedEvidence).toHaveLength(1))
    expect(screen.getByText('借款资金交付证据')).toBeTruthy()
    expect(screen.getByText('到期未还与催收证据')).toBeTruthy()

    clickNextAccept()
    await waitFor(() => expect(confirmedEvidence).toHaveLength(2))
    expect(screen.getByText('到期未还与催收证据')).toBeTruthy()

    clickNextAccept()
    await waitFor(() => expect(confirmedEvidence).toHaveLength(3))

    expect(confirmedEvidence.map((draft) => draft.title)).toEqual(['借贷合意证据', '借款资金交付证据', '到期未还与催收证据'])
    await waitFor(() => expect(screen.getByText('证据 3')).toBeTruthy())
    expect(screen.getAllByText('借贷合意证据').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('借款资金交付证据').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('到期未还与催收证据').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('button', { name: 'AI 继续工作' }).some((button) => button.hasAttribute('disabled'))).toBe(false)
  })
})
