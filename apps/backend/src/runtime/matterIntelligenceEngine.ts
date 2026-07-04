import type { MatterSnapshot } from './matterStateEngine'

export type IntelligenceOutput = {
  health: { score: number; status: 'healthy' | 'warning' | 'blocked' }
  priority: { level: 'high' | 'medium' | 'low'; reason: string }
  next_action: { title: string; reason: string }
  alerts: string[]
  blocking: string[]
  recommendations: string[]
}

export class MatterIntelligenceEngine {
  static evaluate(snapshot: MatterSnapshot, state:any): IntelligenceOutput {
    const s = snapshot
    const blocking: string[] = []
    const alerts: string[] = []
    const recs: string[] = []

    const hasEvidence = (s.evidence?.total || 0) > 0
    const hasResearch = (s.research?.total || 0) > 0
    const hasDraft = (s.documents?.draft || 0) > 0 || (s.documents?.total || 0) > 0
    const hasOpenTask = (s.tasks?.open || 0) > 0

    // Alerts & blocking
    if (!hasEvidence) { alerts.push('No evidence uploaded'); blocking.push('No evidence uploaded'); recs.push('Upload evidence') }
    if (!hasResearch) { alerts.push('No research completed'); blocking.push('No legal research recorded'); recs.push('Create legal research') }
    if (!hasDraft) { alerts.push('No draft document'); blocking.push('No draft document prepared'); recs.push('Draft complaint') }
    if (!hasOpenTask) { alerts.push('No active task'); blocking.push('No active task'); recs.push('Create initial task') }

    // Health score
    let score = 100
    if (!hasEvidence) score -= 20
    if (!hasResearch) score -= 15
    if (!hasDraft) score -= 15
    if (!hasOpenTask) score -= 10
    if (String(s.matter?.status || '').toLowerCase() === 'archived') score = 100
    if (score < 0) score = 0

    let status: 'healthy'|'warning'|'blocked' = 'healthy'
    if (blocking.length > 0) status = 'blocked'
    else if (score < 70) status = 'warning'

    // priority
    let priorityLevel: 'high'|'medium'|'low' = 'low'
    let priorityReason = 'No immediate issues'
    if (blocking.length > 0) { priorityLevel = 'high'; priorityReason = 'Blocking issues present' }
    else if ((state?.completion || 0) < 30) { priorityLevel = 'medium'; priorityReason = 'Low completion' }

    // next action priority: Evidence -> Research -> Draft -> Review -> File
    let nextTitle = 'No action'
    let nextReason = 'All good'
    if (!hasEvidence) { nextTitle = 'Upload evidence'; nextReason = 'Evidence missing' }
    else if (!hasResearch) { nextTitle = 'Create legal research'; nextReason = 'Research missing' }
    else if (!hasDraft) { nextTitle = 'Draft documents'; nextReason = 'No draft found' }
    else if ((s.documents?.draft || 0) > 0) { nextTitle = 'Review draft'; nextReason = 'Draft available for review' }
    else if ((s.documents?.final || 0) > 0) { nextTitle = 'Prepare filing'; nextReason = 'Final document ready' }

    // recommendations dedupe
    const recommendations = Array.from(new Set(recs))

    return {
      health: { score, status },
      priority: { level: priorityLevel, reason: priorityReason },
      next_action: { title: nextTitle, reason: nextReason },
      alerts,
      blocking,
      recommendations,
    }
  }
}

export default MatterIntelligenceEngine
