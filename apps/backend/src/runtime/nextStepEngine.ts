export type RuntimeNextStep = {
  title: string
  reason: string
  estimated_minutes: number
  next_state: string
  lawyer_action: string
  // legacy label preserved
  priority_label?: 'HIGH' | 'NORMAL' | 'LOW'
  // numeric priority for compatibility with tests/tools (higher = more urgent)
  priority: number
  target_workspace: 'evidence' | 'research' | 'documents' | 'execution' | 'runtime'
  action?: string
}

export class NextStepEngine {
  static generate(input: {
    runtime_state?: any[]
    runtime_decision?: any
    runtime_plan?: any
    today_queue?: any[]
    snapshot_facts?: any
  }): RuntimeNextStep {
    const runtime_decision = input?.runtime_decision ?? {}
    const code = String(runtime_decision.code || '').toUpperCase()

    switch (code) {
      case 'COLLECT_EVIDENCE':
        return {
          title: '补充关键证据',
          reason: '当前案件证据不足，建议先补强证据后再进入下一阶段。',
          estimated_minutes: 10,
          next_state: 'REVIEW_EVIDENCE',
          lawyer_action: '上传或确认关键证据',
          priority_label: 'HIGH',
          // numeric priority for compatibility
          priority: 3,
          target_workspace: 'evidence',
          action: 'generate_evidence_draft',
        }
      case 'REVIEW_EVIDENCE':
        return {
          title: '审核证据完整性',
          reason: '已有证据需要律师确认真实性、关联性和完整性。',
          estimated_minutes: 8,
          next_state: 'LEGAL_RESEARCH',
          lawyer_action: '确认已上传证据',
          priority_label: 'HIGH',
          priority: 3,
          target_workspace: 'evidence',
          action: 'review_evidence',
        }
      case 'LEGAL_RESEARCH':
        return {
          title: '开始法律检索',
          reason: '证据基础已具备，建议开始检索相关法规、案例和争点。',
          estimated_minutes: 15,
          next_state: 'DRAFT_DOCUMENTS',
          lawyer_action: '确认开始法律检索',
          priority_label: 'NORMAL',
          priority: 2,
          target_workspace: 'research',
          action: 'legal_research',
        }
      case 'DRAFT_DOCUMENTS':
        return {
          title: '生成诉讼文书',
          reason: '法律检索已完成，建议开始生成起诉状、证据目录或代理词。',
          estimated_minutes: 20,
          next_state: 'READY_TO_FILE',
          lawyer_action: '确认生成文书',
          priority_label: 'NORMAL',
          priority: 2,
          target_workspace: 'documents',
          action: 'draft_documents',
        }
      default:
        return {
          title: '继续推进案件',
          reason: 'AI 已根据当前案件状态生成下一步工作建议。',
          estimated_minutes: 10,
          next_state: 'RUNTIME_REVIEW',
          lawyer_action: '查看 AI 工作中心',
          priority_label: 'NORMAL',
          priority: 2,
          target_workspace: 'runtime',
          action: 'continue_case',
        }
    }
  }
}
