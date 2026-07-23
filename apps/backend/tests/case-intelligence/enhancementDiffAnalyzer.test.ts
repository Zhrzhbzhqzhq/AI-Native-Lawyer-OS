import { describe, expect, it } from 'vitest'
import EnhancementDiffAnalyzer from '../../src/services/case-intelligence/enhancement/analysis/EnhancementDiffAnalyzer'
import { mockCaseModel } from './caseModel.fixture'

describe('EnhancementDiffAnalyzer', () => {
  it('detects an added conflict', () => {
    const base = mockCaseModel()
    const enhanced = {
      ...base,
      conflicts: [...base.conflicts, {
        id: 'conflict-added',
        title: '新增争议',
        description: '双方对履行顺序存在分歧。',
        actorIds: base.actors.map((actor) => actor.id),
      }],
    }

    const diff = new EnhancementDiffAnalyzer().analyze(base, enhanced)

    expect(diff.conflicts.added).toEqual([enhanced.conflicts[enhanced.conflicts.length - 1]])
    expect(diff.conflicts.removed).toEqual([])
    expect(diff.conflicts.changed).toEqual([])
  })

  it('detects decision factor content changes by id', () => {
    const base = mockCaseModel()
    const changedFactor = {
      ...base.decisionFactors[0],
      description: '需要结合付款记录和交付记录进一步核对。',
      impact: 'uncertain' as const,
    }
    const enhanced = { ...base, decisionFactors: [changedFactor] }

    const diff = new EnhancementDiffAnalyzer().analyze(base, enhanced)

    expect(diff.decisionFactors.changed).toHaveLength(1)
    expect(diff.decisionFactors.changed[0]).toMatchObject({
      id: changedFactor.id,
      fields: expect.arrayContaining([
        { field: 'description', before: base.decisionFactors[0].description, after: changedFactor.description },
      ]),
    })
  })

  it('detects removed items and emits an information warning', () => {
    const base = mockCaseModel()
    const removed = base.conflicts[0]
    const enhanced = { ...base, conflicts: base.conflicts.slice(1) }

    const diff = new EnhancementDiffAnalyzer().analyze(base, enhanced)

    expect(diff.conflicts.removed).toEqual([removed])
    expect(diff.warnings).toContainEqual({
      code: 'information_removed',
      path: `conflicts.${removed.id}`,
      message: `Conflict ${removed.id} was removed by enhancement.`,
    })
  })
})
