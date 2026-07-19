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
  it('creates one neutral evidence draft for each material', () => {
    const runtime = new IntakeRuntime()
    const materials = loadCase01Materials()
    const result = runtime.generateEvidenceDrafts({ matter_id: 'case01', materials })
    const drafts = result.evidence_drafts

    expect(result.status).toBe('evidence_draft_ready')
    expect(drafts).toHaveLength(materials.length)

    for (const [index, draft] of drafts.entries()) {
      const material = materials[index]
      expect(draft.material_id).toBe(material.material_id)
      expect(draft.source_material_ids).toEqual([material.material_id])
      expect(draft.materials).toEqual([{ material_id: material.material_id, title: material.title }])
      expect(draft.source).toBe(material.source)
      expect(draft.proof_purpose).toBe(`用于核验材料《${material.title}》所记载的信息，具体证明目的由律师审核确认。`)
      expect(draft.summary.trim().length).toBeGreaterThan(0)
      expect(draft.reasoning.trim().length).toBeGreaterThan(0)
      expect(draft.confidence).toBeGreaterThanOrEqual(0)
      expect(draft.confidence).toBeLessThanOrEqual(1)
      expect(JSON.stringify(draft)).not.toContain('Support claim')
      expect(JSON.stringify(draft)).not.toMatch(/Mock|Demo|Evidence workspace loaded from current matter data/)
    }
  })

  it('keeps unrecognizable materials as neutral candidates for lawyer review', () => {
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

    expect(result.evidence_drafts).toHaveLength(1)
    expect(result.evidence_drafts[0].title).toBe('普通说明证据')
    expect(result.evidence_drafts[0].proof_purpose).toContain('具体证明目的由律师审核确认')
  })

  it('does not inject private-lending concepts into equipment contract materials', () => {
    const runtime = new IntakeRuntime()
    const materials = [
      { material_id: 'mat-1', title: '01_采购合同.md', material_type: 'markdown', source: 'client', content: '双方签订设备采购合同。' },
      { material_id: 'mat-2', title: '02_交付与签收.md', material_type: 'markdown', source: 'client', content: '设备已经交付并签收。' },
      { material_id: 'mat-3', title: '03_安装调试记录.md', material_type: 'markdown', source: 'client', content: '设备完成安装调试。' },
      { material_id: 'mat-4', title: '04_付款流水.md', material_type: 'markdown', source: 'client', content: '已付款600000元，尚欠260000元。' },
      { material_id: 'mat-5', title: '05_质量异议材料.md', material_type: 'markdown', source: 'opponent', content: '对方提出质量异议。' },
    ]

    const result = runtime.generateEvidenceDrafts({ matter_id: 'equipment-contract', materials })
    expect(result.evidence_drafts.map((draft) => draft.title)).toEqual([
      '采购合同证据',
      '交付与签收证据',
      '安装调试记录证据',
      '付款流水证据',
      '质量异议材料证据',
    ])
    expect(result.evidence_drafts.map((draft) => draft.source)).toEqual([
      'client',
      'client',
      'client',
      'client',
      'opponent',
    ])

    const output = JSON.stringify(result.evidence_drafts)
    expect(output).not.toMatch(/借贷合意|借款资金|出借人|借款人|借条|民间借贷|借款本金|利息责任/)
  })
})
