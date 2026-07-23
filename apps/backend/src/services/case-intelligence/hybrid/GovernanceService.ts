import type { CaseIntelligenceInput, CaseModel } from '../types/caseModel.types'
import type { InitialUnderstanding } from './InitialReader'

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings)
  return []
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function actorsFrom(source: string) {
  const actors: Array<{ name: string; role: string }> = []
  for (const match of source.matchAll(/([\u4e00-\u9fff]{2,4})作为([^，。；与]{1,12}?)(?=与|签订|签署|，|。|；)/g)) {
    actors.push({ name: match[1].replace(/^[与和及]/, ''), role: match[2] })
  }
  for (const match of source.matchAll(/([\u4e00-\u9fff]{2,12}公司)/g)) {
    actors.push({ name: match[1], role: '目标公司' })
  }
  const seen = new Set<string>()
  return actors.filter((actor) => {
    if (seen.has(actor.name)) return false
    seen.add(actor.name)
    return true
  })
}

export class GovernanceService {
  generate(input: CaseIntelligenceInput, understanding: InitialUnderstanding): CaseModel {
    const sourceParts = collectStrings(input.context)
    const source = sourceParts.join('\n')
    const extractedActors = actorsFrom(source)
    const actors = (extractedActors.length > 0 ? extractedActors : [{ name: '待确认主体', role: '待确认' }])
      .map((actor, index) => ({
        id: `hybrid-actor-${index + 1}`,
        name: actor.name,
        role: actor.role,
        position: '待律师确认',
      }))
    const actorIds = actors.map((actor) => actor.id)
    const importantFacts = unique(understanding.importantFacts)
    const conflicts = unique(understanding.possibleConflicts)
    const uncertainties = unique(understanding.uncertainties)

    return {
      identity: {
        caseId: input.case_id,
        title: input.title,
        caseType: understanding.caseNature.trim() || '待确认',
        stage: '待确认',
        jurisdiction: '待确认',
      },
      narrative: {
        summary: understanding.summary.trim() || input.title,
        background: sourceParts.join(' ') || '待确认',
        currentPosture: conflicts[0] || uncertainties[0] || '待确认',
      },
      actors,
      timeline: importantFacts.map((fact, index) => ({
        id: `hybrid-timeline-${index + 1}`,
        date: '待确认',
        event: fact,
        actorIds,
        certainty: source.includes(fact) ? 'confirmed' : 'unknown',
      })),
      conflicts: conflicts.map((conflict, index) => ({
        id: `hybrid-conflict-${index + 1}`,
        title: conflict,
        description: conflict,
        actorIds,
      })),
      decisionFactors: conflicts.map((conflict, index) => ({
        id: `hybrid-factor-${index + 1}`,
        label: conflict,
        description: `需律师核对原始材料：${conflict}`,
        impact: 'uncertain',
      })),
      risks: [],
      unknowns: uncertainties.map((question, index) => ({
        id: `hybrid-unknown-${index + 1}`,
        question,
        importance: 'high',
      })),
      selfReview: {
        confidence: uncertainties.length > 0 ? 0.6 : 0.75,
        limitations: uncertainties,
        assumptions: [],
        requiresLawyerReview: true,
      },
    }
  }
}

export default GovernanceService
