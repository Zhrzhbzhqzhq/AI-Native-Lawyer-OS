import { describe, expect, it } from 'vitest'
import FACT_PROMPT from '../src/prompts/research/fact_prompt'
import { validateFacts } from '../src/services/ai/AIOutputValidator'
import FactDraftService, { assertFormalFactClean, buildFormalFactContent } from '../src/services/factDraftService'

describe('M150.3 Fact Quality Guard', () => {
  it('requires category-specific evidence and dispute descriptions', () => {
    expect(validateFacts([{
      title: '设备已经交付',
      description: '双方形成设备签收记录。',
      category: 'confirmed',
      evidence_titles: ['交付与签收证据'],
    }]).ok).toBe(true)

    expect(validateFacts([{
      title: '设备已经交付',
      description: '双方形成设备签收记录。',
      category: 'confirmed',
      evidence_titles: [],
    }]).errors).toContain('fact[0].confirmed fact must reference evidence')

    expect(validateFacts([{
      title: '设备质量情况',
      description: '设备质量情况需要进一步确认。',
      category: 'to_prove',
      evidence_titles: [],
    }]).errors).toContain('fact[0].to_prove description must identify missing proof')

    expect(validateFacts([{
      title: '设备质量存在异议',
      description: '对方提出质量异议，双方陈述不一致。',
      category: 'disputed',
      evidence_titles: ['质量异议材料证据'],
    }]).ok).toBe(true)
  })

  it('rejects legal conclusions while allowing objective material statements', () => {
    for (const description of [
      '对方已经构成违约。',
      '对方依法应承担赔偿责任。',
      '双方合同关系已经成立。',
      '现有证据足以证明原告主张。',
    ]) {
      expect(validateFacts([{
        title: '案件事实',
        description,
        category: 'confirmed',
        evidence_titles: ['采购合同证据'],
      }]).errors).toContain('fact[0] contains legal conclusion')
    }

    expect(validateFacts([{
      title: '合同载明逾期付款责任',
      description: '采购合同文本载明逾期付款责任条款。',
      category: 'confirmed',
      evidence_titles: ['采购合同证据'],
    }]).ok).toBe(true)
  })

  it('uses only exact Evidence titles and never assigns by array position', () => {
    const service = new FactDraftService({} as any)
    const evidences = [
      { evidence_id: 'ev-payment', title: '付款流水证据' },
      { evidence_id: 'ev-quality', title: '质量异议材料证据' },
    ]

    const exact = (service as any).normalizeSuggestions([{
      title: '已支付部分设备款',
      description: '付款流水记载已支付部分设备款。',
      evidence_titles: ['付款流水证据'],
    }], evidences)
    expect(exact[0].source_evidence_ids).toEqual(['ev-payment'])

    expect((service as any).normalizeSuggestions([{
      title: '已支付部分设备款',
      description: '付款流水记载已支付部分设备款。',
      evidence_titles: ['付款流水'],
    }], evidences)).toEqual([])

    expect((service as any).normalizeSuggestions([{
      title: '无明确来源事实',
      description: '没有提供 Evidence 标题。',
    }], evidences)).toEqual([])
  })

  it('does not enrich formal Facts with Matter title or lending conclusions', () => {
    const formal = buildFormalFactContent({
      title: '设备款尚未全部支付',
      description: '付款记录显示尚有部分设备款未支付。',
    }, { title: '甲公司诉乙公司合同纠纷' })

    expect(formal).toEqual({
      title: '设备款尚未全部支付',
      description: '付款记录显示尚有部分设备款未支付。',
    })
    expect(JSON.stringify(formal)).not.toMatch(/借款|民间借贷|法律关系/)
    expect(() => assertFormalFactClean('责任判断', '对方构成违约。')).toThrow('unsafe_formal_fact_content')
  })

  it('documents the Fact and legal-evaluation boundary in the prompt', () => {
    expect(FACT_PROMPT).toContain('时间、主体、行为、对象、结果和证据来源')
    expect(FACT_PROMPT).toContain('不得包含法律评价、责任结论、证明力判断或未经材料支持的推定')
  })
})
