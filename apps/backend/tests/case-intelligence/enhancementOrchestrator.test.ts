import { describe, expect, it, vi } from 'vitest'
import CaseModelValidator from '../../src/services/case-intelligence/CaseModelValidator'
import EnhancementOrchestrator from '../../src/services/case-intelligence/enhancement/EnhancementOrchestrator'
import { mockCaseModel } from './caseModel.fixture'

const input = {
  case_id: 'case-001',
  title: '设备买卖合同纠纷',
  context: [{ id: 'material-contract', content: '双方对设备产能和现场条件存在争议。' }],
}

describe('EnhancementOrchestrator', () => {
  it('runs Conflict then DecisionFactor then Diff and exposes warnings', async () => {
    const order: string[] = []
    const base = mockCaseModel()
    const addedConflict = {
      id: 'conflict-enhanced',
      title: '设备产能争议',
      description: '双方对设备产能和现场条件存在争议。',
      actorIds: base.actors.map((actor) => actor.id),
    }
    const addedFactor = {
      id: 'factor-enhanced',
      label: '现场条件核验',
      description: '需要核验 actor-external 所称现场条件。',
      impact: 'uncertain' as const,
    }
    const conflictEnhancer = {
      enhance: vi.fn(async (_input, model) => {
        order.push('conflict')
        return { ...model, conflicts: [...model.conflicts, addedConflict] }
      }),
    }
    const decisionFactorEnhancer = {
      enhance: vi.fn(async (_input, model) => {
        order.push('decisionFactor')
        return { ...model, decisionFactors: [...model.decisionFactors, addedFactor] }
      }),
    }
    const diffAnalyzer = {
      analyze: vi.fn((baseModel, enhancedModel) => {
        order.push('diff')
        const warning = {
          code: 'unknown_reference',
          path: 'decisionFactors',
          message: 'actor-external does not exist in the base CaseModel.',
        }
        return {
          conflicts: { added: [addedConflict], removed: [], changed: [] },
          decisionFactors: { added: [addedFactor], removed: [], changed: [] },
          risks: { added: [], removed: [], changed: [] },
          warnings: [warning],
        }
      }),
    }

    const result = await new EnhancementOrchestrator(
      conflictEnhancer,
      decisionFactorEnhancer,
      diffAnalyzer,
    ).enhance(input, base)

    expect(order).toEqual(['conflict', 'decisionFactor', 'diff'])
    expect(result.enhancedCaseModel.conflicts).toContainEqual(addedConflict)
    expect(result.enhancedCaseModel.decisionFactors).toContainEqual(addedFactor)
    expect(result.enhancedCaseModel.identity).toBe(base.identity)
    expect(result.warnings).toEqual(result.diff.warnings)
    expect(result.warnings).toHaveLength(1)
    expect(new CaseModelValidator().validate(result.enhancedCaseModel).ok).toBe(true)
  })

  it('rejects unauthorized CaseModel changes from an enhancement stage', async () => {
    const base = mockCaseModel()
    const conflictEnhancer = {
      enhance: vi.fn(async (_input, model) => ({
        ...model,
        identity: { ...model.identity, title: '被未授权修改的标题' },
      })),
    }
    const decisionFactorEnhancer = { enhance: vi.fn() }

    await expect(new EnhancementOrchestrator(
      conflictEnhancer,
      decisionFactorEnhancer,
    ).enhance(input, base)).rejects.toThrow('enhancement_unauthorized_field_change:identity')
    expect(decisionFactorEnhancer.enhance).not.toHaveBeenCalled()
  })

  it('rejects a final CaseModel that does not pass CaseModelValidator', async () => {
    const base = mockCaseModel()
    const conflictEnhancer = { enhance: vi.fn(async (_input, model) => model) }
    const decisionFactorEnhancer = {
      enhance: vi.fn(async (_input, model) => ({
        ...model,
        decisionFactors: [{
          id: 'factor-invalid',
          label: '',
          description: '',
          impact: 'prediction',
        }],
      })),
    }

    await expect(new EnhancementOrchestrator(
      conflictEnhancer,
      decisionFactorEnhancer,
    ).enhance(input, base)).rejects.toMatchObject({
      message: 'enhancement_orchestrator_case_model_invalid',
      failingStage: 'enhancement_orchestrator_validation',
    })
  })
})
