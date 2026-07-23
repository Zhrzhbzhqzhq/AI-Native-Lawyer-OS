import { describe, expect, it } from 'vitest'
import ConflictEnhancementNormalizer from '../../src/services/case-intelligence/enhancement/ConflictEnhancementNormalizer'
import { mockCaseModel } from './caseModel.fixture'

describe('ConflictEnhancementNormalizer', () => {
  it('keeps a valid conflict array', () => {
    const model = mockCaseModel()

    expect(new ConflictEnhancementNormalizer().normalize(model.conflicts, model))
      .toEqual(model.conflicts)
  })

  it('extracts conflicts from an object wrapper', () => {
    const model = mockCaseModel()

    expect(new ConflictEnhancementNormalizer().normalize({ conflicts: model.conflicts }, model))
      .toEqual(model.conflicts)
  })

  it('converts a conflict string into a schema-compatible conflict array', () => {
    const model = mockCaseModel()

    expect(new ConflictEnhancementNormalizer().normalize('双方对付款条件存在争议', model))
      .toEqual([{
        id: 'conflict-enhanced-1',
        title: '双方对付款条件存在争议',
        description: '双方对付款条件存在争议',
        actorIds: model.actors.map((actor) => actor.id),
      }])
  })

  it('filters invalid elements and rejects an invalid output container', () => {
    const model = mockCaseModel()
    expect(new ConflictEnhancementNormalizer().normalize([
      null,
      7,
      { id: '', title: '无效', description: '无效', actorIds: [] },
      model.conflicts[0],
    ], model)).toEqual([model.conflicts[0]])

    expect(() => new ConflictEnhancementNormalizer().normalize(42, model))
      .toThrow('conflict_enhancement_output_invalid')
  })
})
