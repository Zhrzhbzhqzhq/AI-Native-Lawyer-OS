import type {
  CaseComparisonEvaluation,
  CaseEvaluation,
  CaseEvaluationDimension,
  CaseModel,
} from './types/caseModel.types'

export const CASE_EVALUATION_WEIGHTS = {
  identity: 15,
  narrative: 20,
  actors: 10,
  conflicts: 15,
  decisionFactors: 15,
  risks: 10,
  unknowns: 10,
  topicDrift: 5,
} as const

function normalize(value: unknown) {
  return String(value || '').toLowerCase().replace(/[\s，。；：、,.!?！？（）()【】\[\]"']/g, '')
}

function textSimilarity(left: unknown, right: unknown) {
  const a = new Set(Array.from(normalize(left)))
  const b = new Set(Array.from(normalize(right)))
  if (a.size === 0 && b.size === 0) return 100
  if (a.size === 0 || b.size === 0) return 0
  const intersection = Array.from(a).filter((token) => b.has(token)).length
  const union = new Set([...a, ...b]).size
  return Math.round((intersection / union) * 100)
}

const LEGAL_CONCEPT_GROUPS: Readonly<Record<string, readonly string[]>> = {
  dispute: ['争议', '纠纷', '分歧', '异议'],
  contract: ['合同', '协议', '约定', '条款'],
  equityTransfer: ['股权转让', '股权受让', '转让方', '受让方', '目标股权', '股权交割', '股权过户'],
  payment: ['付款', '支付', '价款', '剩余款', '尾款', '对价'],
  delivery: ['交割', '交付', '过户', '变更登记', '转移'],
  performance: ['履行', '完成', '兑现', '执行合同'],
  performanceOrder: ['先后', '顺序', '同时履行', '先履行', '后履行', '是否影响', '前提', '条件'],
  validity: ['有效', '效力', '成立'],
  termination: ['终止', '撤销', '解除合同'],
  evidence: ['证据', '凭证', '记录', '材料'],
  notice: ['通知', '送达', '告知'],
  amount: ['金额', '数额', '价款', '款项'],
}

const CASE_DOMAIN_SIGNALS: Readonly<Record<string, readonly string[]>> = {
  equity: ['股权', '受让方', '转让方', '目标公司', '工商变更'],
  labor: ['劳动关系', '劳动合同', '劳动者', '用人单位', '工资', '工伤', '劳动仲裁'],
  lending: ['借款', '借贷', '出借人', '借款人', '借条', '还款'],
  goods: ['设备采购', '买卖合同', '供货方', '货物', '设备交付'],
  construction: ['建设工程', '施工合同', '承包人', '发包人', '工程款'],
}

function concepts(value: unknown) {
  const text = String(value || '')
  const result = new Set<string>()
  for (const [concept, expressions] of Object.entries(LEGAL_CONCEPT_GROUPS)) {
    if (expressions.some((expression) => text.includes(expression))) result.add(concept)
  }
  if (result.has('equityTransfer')) result.add('transactionPerformance')
  if (result.has('payment') && (result.has('delivery') || result.has('performanceOrder'))) {
    result.add('transactionPerformance')
  }
  if (result.has('contract') && result.has('performance')) result.add('transactionPerformance')
  if (result.has('performance') && result.has('performanceOrder')) result.add('transactionPerformance')
  return result
}

function semanticSimilarity(left: unknown, right: unknown) {
  const a = concepts(left)
  const b = concepts(right)
  if (a.size === 0 || b.size === 0) return textSimilarity(left, right)
  const conceptScore = conceptOverlapSimilarity(left, right)
  return Math.round((conceptScore * 0.8) + (textSimilarity(left, right) * 0.2))
}

function conceptOverlapSimilarity(left: unknown, right: unknown) {
  const a = concepts(left)
  const b = concepts(right)
  if (a.size === 0 || b.size === 0) return textSimilarity(left, right)
  const intersection = Array.from(a).filter((concept) => b.has(concept)).length
  return Math.round((intersection / Math.min(a.size, b.size)) * 100)
}

function domains(value: unknown) {
  const text = String(value || '')
  return new Set(Object.entries(CASE_DOMAIN_SIGNALS)
    .filter(([, expressions]) => expressions.some((expression) => text.includes(expression)))
    .map(([domain]) => domain))
}

function average(scores: number[]) {
  if (scores.length === 0) return 100
  return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
}

function collectionScore<T>(
  actual: T[],
  golden: T[],
  textOf: (item: T) => unknown,
  similarity: (left: unknown, right: unknown) => number = textSimilarity,
) {
  if (golden.length === 0) return actual.length === 0 ? 100 : 0
  const available = new Set(actual.map((_, index) => index))
  const scores = golden.map((expected) => {
    let bestIndex = -1
    let bestScore = 0
    for (const index of available) {
      const score = similarity(textOf(actual[index]), textOf(expected))
      if (score > bestScore) {
        bestScore = score
        bestIndex = index
      }
    }
    if (bestIndex >= 0) available.delete(bestIndex)
    return bestScore
  })
  const recall = average(scores)
  const surplusPenalty = actual.length > golden.length
    ? Math.min(30, Math.round(((actual.length - golden.length) / golden.length) * 20))
    : 0
  return Math.max(0, recall - surplusPenalty)
}

function dimension(
  score: number,
  weight: number,
  details: string,
  components?: Record<string, number>,
): CaseEvaluationDimension {
  return { score: Math.max(0, Math.min(100, Math.round(score))), weight, details, ...(components ? { components } : {}) }
}

function modelTopic(model: CaseModel) {
  return [
    model.identity.title, model.identity.caseType,
    model.narrative.summary, model.narrative.background,
    ...model.actors.flatMap((item) => [item.name, item.role, item.position]),
    ...model.conflicts.flatMap((item) => [item.title, item.description]),
    ...model.decisionFactors.flatMap((item) => [item.label, item.description]),
  ].join(' ')
}

function modelEssence(model: CaseModel) {
  return [
    model.identity.title,
    model.identity.caseType,
    model.narrative.summary,
    ...model.conflicts.flatMap((item) => [item.title, item.description]),
  ].join(' ')
}

function topicDriftScore(actual: CaseModel, golden: CaseModel) {
  const actualTopic = modelTopic(actual)
  const goldenTopic = modelTopic(golden)
  const actualDomains = domains(actualTopic)
  const goldenDomains = domains(goldenTopic)
  const foreignDomains = Array.from(actualDomains).filter((domain) => !goldenDomains.has(domain))
  const expectedDomainPresent = goldenDomains.size === 0
    || Array.from(goldenDomains).some((domain) => actualDomains.has(domain))

  if (foreignDomains.length > 0 && !expectedDomainPresent) {
    return { score: Math.min(35, semanticSimilarity(actualTopic, goldenTopic)), detected: true }
  }

  const semanticScore = semanticSimilarity(modelEssence(actual), modelEssence(golden))
  const score = expectedDomainPresent ? Math.max(60, semanticScore) : semanticScore
  return { score, detected: false }
}

function decisionFactorSimilarity(left: unknown, right: unknown) {
  const leftValue = left as { text: string; impact: string }
  const rightValue = right as { text: string; impact: string }
  const conceptScore = conceptOverlapSimilarity(leftValue.text, rightValue.text)
  const impactScore = leftValue.impact === rightValue.impact ? 100 : 60
  return Math.round((conceptScore * 0.9) + (impactScore * 0.1))
}

const ACTOR_ROLE_GROUPS: Readonly<Record<string, readonly string[]>> = {
  transferee: ['受让方', '股权受让人', '买方'],
  transferor: ['转让方', '股权转让人', '卖方'],
  claimant: ['原告', '申请人', '主张方'],
  respondent: ['被告', '被申请人', '相对方'],
  company: ['目标公司', '公司'],
  creditor: ['债权人', '出借人'],
  debtor: ['债务人', '借款人'],
}

function actorRoleConcepts(value: unknown) {
  const text = String(value || '')
  return new Set(Object.entries(ACTOR_ROLE_GROUPS)
    .filter(([, expressions]) => expressions.some((expression) => text.includes(expression)))
    .map(([role]) => role))
}

function actorRoleSimilarity(left: unknown, right: unknown) {
  const a = actorRoleConcepts(left)
  const b = actorRoleConcepts(right)
  if (a.size === 0 || b.size === 0) return textSimilarity(left, right)
  const shared = Array.from(a).filter((role) => b.has(role)).length
  if (shared > 0) return 100
  return 0
}

function actorSimilarity(left: unknown, right: unknown) {
  const a = left as CaseModel['actors'][number]
  const b = right as CaseModel['actors'][number]
  return Math.round(
    (textSimilarity(a.name, b.name) * 0.5)
    + (actorRoleSimilarity(a.role, b.role) * 0.35)
    + (semanticSimilarity(a.position, b.position) * 0.15),
  )
}

const REVIEW_THEME_GROUPS: Readonly<Record<string, readonly string[]>> = {
  performanceOrder: ['顺序', '先后', '先履行', '后履行', '同时履行', '是否影响', '前提'],
  payment: ['付款', '支付', '价款', '尾款', '对价'],
  delivery: ['交割', '交付', '过户', '登记', '转移'],
  contractTerms: ['合同', '协议', '约定', '条款'],
  ambiguity: ['不明确', '约定不明', '不清楚', '需要审查', '待审查', '需要核验', '待核验'],
  evidenceGap: ['证据不足', '材料不全', '缺少材料', '凭证缺失', '记录缺失'],
  amount: ['金额', '数额', '多少', '价款'],
  timing: ['何时', '时间', '期限', '日期'],
}

function reviewThemes(value: unknown) {
  const text = String(value || '')
  const result = new Set(Object.entries(REVIEW_THEME_GROUPS)
    .filter(([, expressions]) => expressions.some((expression) => text.includes(expression)))
    .map(([theme]) => theme))
  if (result.has('payment') && (result.has('delivery') || result.has('performanceOrder'))) {
    result.add('transactionPerformance')
  }
  return result
}

function themeSimilarity(left: unknown, right: unknown) {
  const a = reviewThemes(left)
  const b = reviewThemes(right)
  if (a.size === 0 || b.size === 0) return semanticSimilarity(left, right)
  const intersection = Array.from(a).filter((theme) => b.has(theme)).length
  const coverage = Math.round((intersection / Math.min(a.size, b.size)) * 100)
  return Math.round((coverage * 0.9) + (semanticSimilarity(left, right) * 0.1))
}

function relationshipSimilarity(left: unknown, right: unknown) {
  const a = domains(left)
  const b = domains(right)
  if (a.size === 0 || b.size === 0) return semanticSimilarity(left, right)
  const intersection = Array.from(a).filter((domain) => b.has(domain)).length
  return Math.round((intersection / Math.min(a.size, b.size)) * 100)
}

export class CaseEvaluationService {
  evaluate(model: CaseModel): CaseEvaluation {
    const dimensions = {
      identity: model.identity.caseId && model.identity.title ? 100 : 0,
      narrative: model.narrative.summary ? 100 : 0,
      actors: model.actors.length > 0 ? 100 : 0,
      timeline: model.timeline.length > 0 ? 100 : 0,
      conflicts: model.conflicts.length > 0 ? 100 : 0,
      decisionFactors: model.decisionFactors.length > 0 ? 100 : 0,
      selfReview: model.selfReview.requiresLawyerReview ? 100 : 0,
    }
    const scores = Object.values(dimensions)
    const completeness = Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
    const notes = Object.entries(dimensions).filter(([, score]) => score === 0).map(([field]) => `${field}_incomplete`)
    return { caseId: model.identity.caseId, status: completeness === 100 ? 'ready' : 'incomplete', completeness, dimensions, notes }
  }

  compare(actual: CaseModel, golden: CaseModel): CaseComparisonEvaluation {
    const businessRelationship = relationshipSimilarity(
      `${actual.identity.title} ${actual.narrative.summary}`,
      `${golden.identity.title} ${golden.narrative.summary}`,
    )
    const legalRelationship = semanticSimilarity(actual.identity.caseType, golden.identity.caseType)
    const coreNature = semanticSimilarity(modelEssence(actual), modelEssence(golden))
    const essenceScore = average([businessRelationship, legalRelationship, coreNature])
    const identityScore = average([
      businessRelationship,
      legalRelationship,
      coreNature,
      textSimilarity(actual.identity.stage, golden.identity.stage),
      textSimilarity(actual.identity.jurisdiction, golden.identity.jurisdiction),
    ])
    const narrativeScore = average([
      semanticSimilarity(actual.narrative.summary, golden.narrative.summary),
      semanticSimilarity(actual.narrative.background, golden.narrative.background),
      textSimilarity(actual.narrative.currentPosture, golden.narrative.currentPosture),
      essenceScore,
    ])
    const topic = topicDriftScore(actual, golden)
    const dimensions = {
      identity: dimension(
        identityScore,
        CASE_EVALUATION_WEIGHTS.identity,
        '分别评价业务关系、法律关系、核心争议本质，并结合阶段和法域。',
        { businessRelationship, legalRelationship, coreNature },
      ),
      narrative: dimension(narrativeScore, CASE_EVALUATION_WEIGHTS.narrative, '摘要、背景、当前状态及案件本质的法律语义匹配。'),
      actors: dimension(collectionScore(actual.actors, golden.actors, (item) => item, actorSimilarity), CASE_EVALUATION_WEIGHTS.actors, '按主体名称、归一化法律角色和立场进行最佳一对一匹配。'),
      conflicts: dimension(collectionScore(actual.conflicts, golden.conflicts, (item) => `${item.title} ${item.description}`, semanticSimilarity), CASE_EVALUATION_WEIGHTS.conflicts, '按付款、交割、履行顺序等归一化法律概念进行同义争点匹配。'),
      decisionFactors: dimension(collectionScore(
        actual.decisionFactors.map((item) => ({ text: `${item.label} ${item.description}`, impact: item.impact })),
        golden.decisionFactors.map((item) => ({ text: `${item.label} ${item.description}`, impact: item.impact })),
        (item) => item,
        decisionFactorSimilarity,
      ), CASE_EVALUATION_WEIGHTS.decisionFactors, '按决策因素法律概念匹配，影响方向仅作为辅助信号。'),
      risks: dimension(collectionScore(actual.risks, golden.risks, (item) => `${item.description} ${item.mitigation}`, themeSimilarity), CASE_EVALUATION_WEIGHTS.risks, '按履行顺序、条款明确性、材料缺口等风险主题匹配。'),
      unknowns: dimension(collectionScore(actual.unknowns, golden.unknowns, (item) => item.question, themeSimilarity), CASE_EVALUATION_WEIGHTS.unknowns, '按付款、交割、金额、时间等待确认事项概念匹配。'),
      topicDrift: dimension(topic.score, CASE_EVALUATION_WEIGHTS.topicDrift, '区分合同履行等正常法律扩展与劳动、借贷等跨案件强领域污染。'),
    }
    const score = Math.round(Object.values(dimensions).reduce((total, item) => total + (item.score * item.weight / 100), 0))
    return {
      caseId: actual.identity.caseId,
      status: 'completed',
      score,
      dimensions,
      topicDriftDetected: topic.detected,
      errors: [],
    }
  }
}

export default CaseEvaluationService
