import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import IntakeRuntime from '../src/runtime/intakeRuntime'

const case01Dir = path.resolve(process.cwd(), '../../test-data/case01_golden/materials')

describe('IntakeRuntime matter_draft extraction', () => {
  it('extracts Case01 matter basics from markdown content without external network', () => {
    const runtime = new IntakeRuntime()
    const files = [
      '001_客户咨询记录.md',
      '003_微信聊天_借款形成.md',
      '005_借条.md',
    ].map((name) => ({
      name,
      size: 100,
      type: 'text/markdown',
      content: readFileSync(path.join(case01Dir, name), 'utf8'),
    }))

    const result = runtime.run({
      job_id: 'intake-case01',
      matter_id: null,
      source: 'Plaintiff',
      files,
    })

    expect(result.analysis.matter_draft.title).toBe('张建国诉李海涛民间借贷纠纷')
    expect(result.analysis.matter_draft.client).toBe('张建国')
    expect(result.analysis.matter_draft.opponent).toBe('李海涛')
    expect(result.analysis.matter_draft.matter_type).toBe('民间借贷纠纷')
    expect(result.analysis.matter_draft.confidence?.title).toBeGreaterThanOrEqual(0.8)
  })

  it('does not fabricate matter basics when only binary metadata is available', () => {
    const runtime = new IntakeRuntime()

    const result = runtime.run({
      job_id: 'intake-no-content',
      matter_id: null,
      source: 'Plaintiff',
      files: [{ name: 'scan.pdf', size: 100, type: 'application/pdf' }],
    })

    expect(result.analysis.matter_draft.title).toBe('')
    expect(result.analysis.matter_draft.client).toBe('')
    expect(result.analysis.matter_draft.opponent).toBe('')
    expect(result.analysis.matter_draft.matter_type).toBe('')
    expect(result.analysis.matter_draft.confidence?.title).toBe(0)
  })
})
