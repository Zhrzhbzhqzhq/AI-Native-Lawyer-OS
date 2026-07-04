export type NextStep = {
  id: string
  title: string
  description: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  reason: string
  action: string
  status: 'suggested'
}

function makeId(action: string) {
  return `ns-${action}-${Math.random().toString(36).slice(2,8)}`
}

export default class NextStepEngine {
  evaluate(input: { materialsCount: number; evidenceCount: number; documentsCount: number; recentActivityCount: number }) {
    const { materialsCount, evidenceCount, documentsCount, recentActivityCount } = input
    const steps: NextStep[] = []

    // Rule 1
    if (materialsCount > 0 && evidenceCount === 0) {
      steps.push({
        id: makeId('generate_evidence_draft'),
        title: '生成证据草稿',
        description: '根据已有案件资料，生成可用的证据草稿以支持主张',
        priority: 'HIGH',
        reason: '有案件资料但尚未形成证据',
        action: 'generate_evidence_draft',
        status: 'suggested',
      })
    }

    // Rule 2
    if (evidenceCount > 0 && documentsCount === 0) {
      steps.push({
        id: makeId('generate_primary_document'),
        title: '生成起诉状或核心文书',
        description: '基于已确认证据，起草起诉状或其他核心文书',
        priority: 'HIGH',
        reason: '存在证据但尚无文书',
        action: 'generate_primary_document',
        status: 'suggested',
      })
    }

    // Rule 3
    if (documentsCount > 0) {
      steps.push({
        id: makeId('review_document_updates'),
        title: '检查文书是否需要更新',
        description: '审查现有文书，判断是否需要基于新证据或事实更新',
        priority: 'MEDIUM',
        reason: '已有文书可能需更新',
        action: 'review_document_updates',
        status: 'suggested',
      })
    }

    // Rule 4
    if (recentActivityCount === 0) {
      steps.push({
        id: makeId('add_case_materials'),
        title: '补充案件基础资料',
        description: '收集并添加案件相关基础资料，以便推进后续工作',
        priority: 'MEDIUM',
        reason: '近期无活动，案件资料可能不足',
        action: 'add_case_materials',
        status: 'suggested',
      })
    }

    // return up to 3 suggestions
    return steps.slice(0, 3)
  }
}
