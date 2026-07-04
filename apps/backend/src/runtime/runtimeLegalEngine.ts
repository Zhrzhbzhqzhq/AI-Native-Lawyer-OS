import type { RuntimePlan } from './runtimePlannerEngine'

export type WorkType = 'EvidenceWork' | 'ResearchWork' | 'DocumentWork' | 'MonitorWork'

export type RuntimeWork = {
  work_id: string
  type: WorkType
  title: string
  status: 'PENDING' | 'BLOCKED'
  depends_on: string[]
  target_ref?: TargetRef
}

export type TargetRef = {
  workspace: 'evidence' | 'documents' | 'runtime'
  object_type: 'Evidence' | 'Document' | 'Research' | 'Matter'
  object_ids: string[]
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function worksFromRuntimePlan(plan: RuntimePlan): RuntimeWork[] {
  const steps = plan?.steps || []

  let hasEvidence = false
  let evidenceNeedsReview = false
  let hasResearch = false
  let hasDocument = false
  let hasMonitor = false

  for (const step of steps) {
    const s = String(step || '').toLowerCase()

    if (s.includes('evidence') || s.includes('material') || s.includes('attach') || s.includes('evidence entries')) {
      hasEvidence = true
      if (s.includes('review') || s.includes('weak') || s.includes('audit') || s.includes('strengthen') || s.includes('associate')) {
        evidenceNeedsReview = true
      }
    }

    if (s.includes('research') || s.includes('legal') || s.includes('questions') || s.includes('research tasks')) {
      hasResearch = true
    }

    if (s.includes('document') || s.includes('draft') || s.includes('finalize') || s.includes('align') || s.includes('drafts') || s.includes('final')) {
      hasDocument = true
    }

    if (s.includes('monitor') || s.includes('periodic') || s.includes('check') || s.includes('event') || s.includes('log') || s.includes('notify') || s.includes('activity')) {
      hasMonitor = true
    }
  }

  const works: RuntimeWork[] = []

  if (hasEvidence) {
    const title = evidenceNeedsReview ? 'Evidence Review' : 'Evidence Collection'
    const workId = evidenceNeedsReview ? 'work-evidence-review' : 'work-evidence-collection'
    works.push({
      work_id: workId,
      type: 'EvidenceWork',
      title,
      status: 'PENDING',
      depends_on: [],
      target_ref: { workspace: 'evidence', object_type: 'Evidence', object_ids: [] },
    })
  }

  if (hasResearch) {
    works.push({
      work_id: 'work-research-law',
      type: 'ResearchWork',
      title: 'Legal Research',
      status: 'PENDING',
      depends_on: [],
      target_ref: { workspace: 'runtime', object_type: 'Research', object_ids: [] },
    })
  }

  if (hasDocument) {
    works.push({
      work_id: 'work-document-review',
      type: 'DocumentWork',
      title: 'Document Review',
      status: 'PENDING',
      depends_on: [],
      target_ref: { workspace: 'documents', object_type: 'Document', object_ids: [] },
    })
  }

  if (hasMonitor) {
    works.push({
      work_id: 'work-monitor-matter',
      type: 'MonitorWork',
      title: 'Matter Monitoring',
      status: 'PENDING',
      depends_on: [],
      target_ref: { workspace: 'runtime', object_type: 'Matter', object_ids: [] },
    })
  }

  return works
}
