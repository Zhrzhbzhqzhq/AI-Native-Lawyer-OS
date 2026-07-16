import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import IntakeRuntime from '../src/runtime/intakeRuntime'

const case01Files = [
  '001_客户咨询记录.md',
  '002_咨询录音整理.md',
  '003_微信聊天_借款形成.md',
  '004_微信聊天_催收.md',
  '005_借条.md',
  '006_银行流水.md',
  '007_电话录音整理.md',
  '008_律师函.md',
]

function loadCase01Materials() {
  const root = path.resolve(process.cwd(), '../../test-data/case01_golden/materials')
  return case01Files.map((title, index) => ({
    material_id: `case01-mat-${index + 1}`,
    title,
    material_type: 'markdown',
    source: 'client',
    content: readFileSync(path.join(root, title), 'utf8'),
  }))
}

describe('Evidence Intelligence V1', () => {
  it('aggregates Case01 materials into proof-purpose evidence drafts', () => {
    const runtime = new IntakeRuntime()
    const materials = loadCase01Materials()
    const result = runtime.generateEvidenceDrafts({ matter_id: 'case01', materials })
    const drafts = result.evidence_drafts

    expect(result.status).toBe('evidence_draft_ready')
    expect(drafts.length).toBeGreaterThanOrEqual(3)
    expect(drafts.length).toBeLessThanOrEqual(6)
    expect(drafts.length).not.toBe(materials.length)
    expect(drafts.some((draft) => draft.source_material_ids.length > 1)).toBe(true)

    const filenames = new Set(materials.map((material) => material.title))
    for (const draft of drafts) {
      expect(filenames.has(draft.title)).toBe(false)
      expect(draft.proof_purpose).toMatch(/[\u4e00-\u9fa5]/)
      expect(draft.summary.trim().length).toBeGreaterThan(0)
      expect(draft.reasoning.trim().length).toBeGreaterThan(0)
      expect(draft.confidence).toBeGreaterThanOrEqual(0)
      expect(draft.confidence).toBeLessThanOrEqual(1)
      expect(JSON.stringify(draft)).not.toContain('Support claim')
      expect(JSON.stringify(draft)).not.toMatch(/Mock|Demo|Evidence workspace loaded from current matter data/)
    }

    const allText = drafts.map((draft) => `${draft.title}\n${draft.proof_purpose}\n${draft.summary}`).join('\n')
    expect(allText).toContain('借贷合意')
    expect(allText).toContain('资金交付')
    expect(allText).toMatch(/到期|催收|未还/)
  })

  it('does not fabricate evidence drafts from unrecognizable materials', () => {
    const runtime = new IntakeRuntime()
    const result = runtime.generateEvidenceDrafts({
      matter_id: 'unknown',
      materials: [
        {
          material_id: 'mat-unknown',
          title: '普通说明.md',
          material_type: 'markdown',
          source: 'client',
          content: '这是一份会议安排说明，记录参会时间、地点和联系人，不涉及案件事实。',
        },
      ],
    })

    expect(result.evidence_drafts).toHaveLength(0)
  })
})
