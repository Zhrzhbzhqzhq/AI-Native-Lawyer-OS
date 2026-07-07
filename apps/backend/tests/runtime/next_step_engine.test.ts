import { describe, it, expect } from 'vitest'
import { NextStepEngine } from '../../src/runtime/nextStepEngine'

describe('NextStepEngine.generate', () => {
  const cases = [
    { code: 'COLLECT_EVIDENCE', expect: { target_workspace: 'evidence', title: '补充关键证据' } },
    { code: 'REVIEW_EVIDENCE', expect: { target_workspace: 'evidence', title: '审核证据完整性' } },
    { code: 'LEGAL_RESEARCH', expect: { target_workspace: 'research', title: '开始法律检索' } },
    { code: 'DRAFT_DOCUMENTS', expect: { target_workspace: 'documents', title: '生成诉讼文书' } },
    { code: 'SOMETHING_ELSE', expect: { target_workspace: 'runtime', title: '继续推进案件' } },
  ]

  for (const c of cases) {
    it(`handles ${c.code}`, () => {
      const out = NextStepEngine.generate({ runtime_decision: { code: c.code } })
      expect(out).toBeTruthy()
      expect(out.target_workspace).toBe(c.expect.target_workspace)
      expect(out.title).toBe(c.expect.title)
    })
  }
})
