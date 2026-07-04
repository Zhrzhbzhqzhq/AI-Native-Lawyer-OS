// Runtime Analyzer: deterministic transformer from snapshot_facts -> runtime_state[]
// Only reads snapshot_facts and returns minimal items as specified.

import { RuntimeStateCode } from './runtimeTypes'
import type { RuntimeStateItem } from './runtimeTypes'

export default function analyzeRuntimeState(snapshotFacts: any): RuntimeStateItem[] {
  const out: RuntimeStateItem[] = []
  const sf = snapshotFacts || {}

  const counts = sf.counts || {}
  const docs = sf.documents || {}
  const ev = sf.evidence || {}
  const activity = sf.activity || {}

  // NEEDS_EVIDENCE: no evidence at all
  if ((counts.evidence || 0) === 0) out.push({ code: RuntimeStateCode.NEEDS_EVIDENCE, value: true })

  // HAS_WEAK_EVIDENCE: number of weak evidence items (only include if >0)
  const weak = Number(ev.weak || 0)
  if (weak > 0) out.push({ code: RuntimeStateCode.HAS_WEAK_EVIDENCE, value: weak })

  // HAS_DRAFT_DOCUMENTS
  const draft = Number(docs.draft || 0)
  if (draft > 0) out.push({ code: RuntimeStateCode.HAS_DRAFT_DOCUMENTS, value: draft })

  // HAS_FINAL_DOCUMENTS
  const finalDocs = Number(docs.final || 0)
  if (finalDocs > 0) out.push({ code: RuntimeStateCode.HAS_FINAL_DOCUMENTS, value: finalDocs })

  // HAS_ARCHIVED_DOCUMENTS
  const archived = Number(docs.archived || 0)
  if (archived > 0) out.push({ code: RuntimeStateCode.HAS_ARCHIVED_DOCUMENTS, value: archived })

  // Recent activity: prefer numeric value; emit RECENT_ACTIVITY if >0 else NO_RECENT_ACTIVITY
  const recent = Number(activity.recent || 0)
  if (recent > 0) {
    out.push({ code: RuntimeStateCode.RECENT_ACTIVITY, value: recent })
  } else {
    out.push({ code: RuntimeStateCode.NO_RECENT_ACTIVITY, value: true })
  }

  // NO_RESEARCH
  if ((counts.research || 0) === 0) out.push({ code: RuntimeStateCode.NO_RESEARCH, value: true })

  return out
}
