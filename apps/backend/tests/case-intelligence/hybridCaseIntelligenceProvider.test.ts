import { describe, expect, it, vi } from 'vitest'
import CaseModelValidator from '../../src/services/case-intelligence/CaseModelValidator'
import {
  GovernanceService,
  HybridCaseIntelligenceProvider,
  InitialReader,
  type InitialUnderstanding,
} from '../../src/services/case-intelligence/hybrid'

const input = {
  case_id: 'case-006',
  title: '陈伟诉李强股权转让合同纠纷',
  context: [{
    title: '股权转让合同',
    content: '陈伟作为受让方与李强作为转让方签订合同。陈伟已支付60万元。双方对付款与交割顺序存在争议。',
  }],
}

const understanding: InitialUnderstanding = {
  caseNature: '股权转让合同纠纷',
  summary: '双方因股权转让合同履行顺序发生争议。',
  importantFacts: ['陈伟已支付60万元'],
  possibleConflicts: ['付款与交割顺序存在争议'],
  uncertainties: ['合同约定的履行顺序是什么？'],
}

describe('Hybrid Case Intelligence Prototype', () => {
  it('uses one MiniMax call to produce InitialUnderstanding', async () => {
    const generator = { generate: vi.fn().mockResolvedValue({ response: understanding }) }

    await expect(new InitialReader(generator).read(input)).resolves.toEqual(understanding)
    expect(generator.generate).toHaveBeenCalledTimes(1)
    expect(generator.generate.mock.calls[0][0]).toMatchObject({
      provider: 'minimax',
      prompt_version: 'case-intelligence-hybrid-initial-v1',
      task: 'case_intelligence_hybrid_initial',
    })
  })

  it('normalizes a non-standard MiniMax response before InitialUnderstanding validation', async () => {
    const generator = {
      generate: vi.fn().mockResolvedValue({
        response: {
          caseNature: '',
          importantFacts: '陈伟已支付60万元',
          possibleConflicts: '付款与交割顺序存在争议',
          uncertainties: '合同约定的履行顺序是什么？',
        },
      }),
    }

    await expect(new InitialReader(generator).read(input)).resolves.toEqual({
      caseNature: 'unknown',
      summary: '',
      importantFacts: ['陈伟已支付60万元'],
      possibleConflicts: ['付款与交割顺序存在争议'],
      uncertainties: ['合同约定的履行顺序是什么？'],
    })
  })

  it('governs InitialUnderstanding into a schema-valid CaseModel', () => {
    const model = new GovernanceService().generate(input, understanding)

    expect(new CaseModelValidator().validate(model, { sourceText: JSON.stringify(input.context) }).ok).toBe(true)
    expect(model).toMatchObject({
      identity: { caseId: 'case-006', caseType: '股权转让合同纠纷' },
      actors: [
        { name: '陈伟', role: '受让方' },
        { name: '李强', role: '转让方' },
      ],
      timeline: [{ event: '陈伟已支付60万元', certainty: 'confirmed' }],
      decisionFactors: [{ impact: 'uncertain' }],
      selfReview: { requiresLawyerReview: true },
    })
  })

  it('runs InitialReader then GovernanceService without CaseChiefService', async () => {
    const initialReader = { read: vi.fn().mockResolvedValue(understanding) }
    const governance = { generate: vi.fn((caseInput, initial) => new GovernanceService().generate(caseInput, initial)) }

    const model = await new HybridCaseIntelligenceProvider(initialReader, governance).generateCaseModel(input)

    expect(initialReader.read).toHaveBeenCalledWith(input)
    expect(governance.generate).toHaveBeenCalledWith(input, understanding)
    expect(model.identity.caseId).toBe('case-006')
  })

  it('runs the complete Hybrid chain with normalized MiniMax output', async () => {
    const generator = {
      generate: vi.fn().mockResolvedValue({
        response: {
          caseNature: '股权转让合同纠纷',
          summary: '双方因履行顺序发生争议。',
          importantFacts: '陈伟已支付60万元',
          possibleConflicts: '付款与交割顺序存在争议',
        },
      }),
    }
    const provider = new HybridCaseIntelligenceProvider(new InitialReader(generator))

    const model = await provider.generateCaseModel(input)

    expect(generator.generate).toHaveBeenCalledTimes(1)
    expect(model).toMatchObject({
      identity: { caseId: 'case-006', caseType: '股权转让合同纠纷' },
      timeline: [{ event: '陈伟已支付60万元', certainty: 'confirmed' }],
      conflicts: [{ description: '付款与交割顺序存在争议' }],
      selfReview: { requiresLawyerReview: true },
    })
    expect(new CaseModelValidator().validate(model, { sourceText: JSON.stringify(input.context) }).ok)
      .toBe(true)
  })
})
