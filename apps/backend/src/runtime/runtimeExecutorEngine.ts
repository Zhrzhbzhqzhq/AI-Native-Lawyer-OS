export type RuntimeActionType =
  | 'PrepareEvidenceAction'
  | 'PrepareResearchAction'
  | 'PrepareDocumentAction'
  | 'MonitorMatterAction'

export type RuntimeAction = {
  action_id: string
  type: RuntimeActionType
  work_id: string
  status: 'READY' | 'BLOCKED'
  payload: Record<string, unknown>
}

type WorkType = 'EvidenceWork' | 'ResearchWork' | 'DocumentWork' | 'MonitorWork'
type RuntimeWork = {
  work_id: string
  type: WorkType
  title?: string
  status?: 'PENDING' | 'BLOCKED' | string
  depends_on?: string[]
}

export default function actionsFromRuntimeWorks(works: RuntimeWork[] = []): RuntimeAction[] {
  if (!Array.isArray(works)) return []

  const mapType = (t: WorkType): RuntimeActionType | null => {
    switch (t) {
      case 'EvidenceWork':
        return 'PrepareEvidenceAction'
      case 'ResearchWork':
        return 'PrepareResearchAction'
      case 'DocumentWork':
        return 'PrepareDocumentAction'
      case 'MonitorWork':
        return 'MonitorMatterAction'
      default:
        return null
    }
  }

  const actions: RuntimeAction[] = []
  const seen = new Set<string>()

  for (const w of works) {
    if (!w || !w.work_id) continue
    if (seen.has(w.work_id)) continue
    seen.add(w.work_id)

    const actionType = mapType(w.type)
    if (!actionType) continue

    const status = String(w.status || '').toUpperCase() === 'BLOCKED' ? 'BLOCKED' : 'READY'

    // Build minimal payload contract for navigation/定位
    const payload: Record<string, unknown> = { target_workspace: 'runtime', target_type: w.type, target_id: null }
    switch (w.type) {
      case 'EvidenceWork':
        payload.target_workspace = 'evidence'
        payload.target_type = 'EvidenceWork'
        break
      case 'ResearchWork':
        payload.target_workspace = 'runtime'
        payload.target_type = 'ResearchWork'
        break
      case 'DocumentWork':
        payload.target_workspace = 'documents'
        payload.target_type = 'DocumentWork'
        break
      case 'MonitorWork':
        payload.target_workspace = 'runtime'
        payload.target_type = 'MonitorWork'
        break
      default:
        break
    }

    actions.push({
      action_id: `action-${w.work_id}`,
      type: actionType,
      work_id: w.work_id,
      status,
      payload,
    })
  }

  return actions
}
