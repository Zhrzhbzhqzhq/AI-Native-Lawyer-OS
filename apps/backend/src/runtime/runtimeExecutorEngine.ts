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

type TargetRef = {
  workspace: 'evidence' | 'documents' | 'runtime'
  object_type: 'Evidence' | 'Document' | 'Research' | 'Matter'
  object_ids: string[]
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

    // Build minimal payload contract for navigation and include target_ref from work when available
    const payload: any = { target_workspace: 'runtime', target_type: w.type, target_ref: { workspace: 'runtime', object_type: 'Matter', object_ids: [] } }
    // override by work.type mapping
    switch (w.type) {
      case 'EvidenceWork':
        payload.target_workspace = 'evidence'
        payload.target_type = 'EvidenceWork'
        payload.target_ref = (w as any).target_ref || { workspace: 'evidence', object_type: 'Evidence', object_ids: [] }
        break
      case 'ResearchWork':
        payload.target_workspace = 'runtime'
        payload.target_type = 'ResearchWork'
        payload.target_ref = (w as any).target_ref || { workspace: 'runtime', object_type: 'Research', object_ids: [] }
        break
      case 'DocumentWork':
        payload.target_workspace = 'documents'
        payload.target_type = 'DocumentWork'
        payload.target_ref = (w as any).target_ref || { workspace: 'documents', object_type: 'Document', object_ids: [] }
        break
      case 'MonitorWork':
        payload.target_workspace = 'runtime'
        payload.target_type = 'MonitorWork'
        payload.target_ref = (w as any).target_ref || { workspace: 'runtime', object_type: 'Matter', object_ids: [] }
        break
      default:
        payload.target_ref = (w as any).target_ref || { workspace: 'runtime', object_type: 'Matter', object_ids: [] }
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
