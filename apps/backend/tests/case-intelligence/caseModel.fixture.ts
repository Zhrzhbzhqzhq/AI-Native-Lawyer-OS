import type { CaseModel } from '../../src/services/case-intelligence/types/caseModel.types'

export function mockCaseModel(): CaseModel {
  return {
    identity: { caseId: 'case-001', title: '合同履行争议', caseType: '合同纠纷', stage: '诉前', jurisdiction: '中国大陆' },
    narrative: { summary: '双方对合同履行存在争议。', background: '双方签订合同。', currentPosture: '正在整理材料。' },
    actors: [{ id: 'actor-1', name: '甲方', role: '委托人', position: '要求继续履行。' }],
    timeline: [{ id: 'time-1', date: '2026-01-01', event: '双方签订合同。', actorIds: ['actor-1'], certainty: 'confirmed' }],
    conflicts: [{ id: 'conflict-1', title: '履行范围', description: '双方对履行范围存在分歧。', actorIds: ['actor-1'] }],
    decisionFactors: [{ id: 'factor-1', label: '合同内容', description: '需要核对完整合同。', impact: 'uncertain' }],
    risks: [{ id: 'risk-1', description: '材料尚不完整。', severity: 'medium', mitigation: '补充材料。' }],
    unknowns: [{ id: 'unknown-1', question: '完整履行范围是什么？', importance: 'high' }],
    selfReview: { confidence: 0.7, limitations: ['材料有限'], assumptions: [], requiresLawyerReview: true },
  }
}
