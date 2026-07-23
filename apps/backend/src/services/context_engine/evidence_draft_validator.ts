import type { MinimalContextMaterial } from './context_types'
import type { EvidenceUnderstandingDraft } from './evidence_draft_schema'

export type EvidenceDraftValidationResult =
  | { ok: true; drafts: EvidenceUnderstandingDraft[] }
  | { ok: false; errors: string[] }

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function genericProofPurpose(value: string) {
  const normalized = value.replace(/[\s，。；、,.!?！？]/g, '')
  return ['证明案件事实', '证明相关事实', '证明有关事实', '证明本案事实'].includes(normalized)
}

export class EvidenceDraftValidator {
  validate(value: unknown, materials: MinimalContextMaterial[]): EvidenceDraftValidationResult {
    const source = value && typeof value === 'object' && !Array.isArray(value)
      ? (value as any).evidence_drafts
      : value
    if (!Array.isArray(source) || source.length === 0) return { ok: false, errors: ['evidence_drafts_required'] }
    const materialById = new Map(materials.map((material) => [material.materialId, material]))
    const errors: string[] = []
    const drafts = source.map((item: any, index) => {
      const prefix = `evidence_drafts[${index}]`
      const sourceMaterialIds = Array.isArray(item?.source_material_ids)
        ? item.source_material_ids.map(text).filter(Boolean)
        : []
      const materialId = text(item?.material_id)
      const title = text(item?.title)
      const proofPurpose = text(item?.proof_purpose)
      const proofRelationship = text(item?.proof_relationship)
      const legalUse = text(item?.legal_use)
      const importance = text(item?.importance)
      if (!title) errors.push(`${prefix}.title_required`)
      if (!proofPurpose) errors.push(`${prefix}.proof_purpose_required`)
      else if (genericProofPurpose(proofPurpose)) errors.push(`${prefix}.proof_purpose_too_generic`)
      if (!proofRelationship) errors.push(`${prefix}.proof_relationship_required`)
      if (!legalUse) errors.push(`${prefix}.legal_use_required`)
      if (!['critical', 'important', 'supporting'].includes(importance)) errors.push(`${prefix}.importance_invalid`)
      if (Object.prototype.hasOwnProperty.call(item || {}, 'evidence_id')) errors.push(`${prefix}.evidence_id_forbidden`)
      if (Object.prototype.hasOwnProperty.call(item || {}, 'status')) errors.push(`${prefix}.status_forbidden`)
      if (text(item?.suggested_action) !== 'confirm_as_evidence') errors.push(`${prefix}.suggested_action_invalid`)
      if (!materialId || !materialById.has(materialId)) errors.push(`${prefix}.material_not_in_matter`)
      if (sourceMaterialIds.length === 0 || sourceMaterialIds.some((id: string) => !materialById.has(id))) {
        errors.push(`${prefix}.source_material_not_in_matter`)
      }
      if (materialId && !sourceMaterialIds.includes(materialId)) errors.push(`${prefix}.primary_material_not_in_sources`)
      const submittedMaterials = Array.isArray(item?.materials) ? item.materials : []
      if (submittedMaterials.length !== sourceMaterialIds.length) errors.push(`${prefix}.materials_mismatch`)
      for (const linked of submittedMaterials) {
        const linkedId = text(linked?.material_id)
        const current = materialById.get(linkedId)
        if (!current || !sourceMaterialIds.includes(linkedId) || text(linked?.title) !== current.title) {
          errors.push(`${prefix}.materials_mismatch`)
          break
        }
      }
      const linkedMaterials = sourceMaterialIds
        .filter((id: string) => materialById.has(id))
        .map((id: string) => ({ material_id: id, title: materialById.get(id)?.title || '' }))
      const rawConfidence = Number(item?.confidence)
      const confidence = Number.isFinite(rawConfidence) ? Math.max(0, Math.min(1, rawConfidence)) : 0.5
      const rawSource = text(item?.source)
      if (!['client', 'opponent', 'court', 'third_party'].includes(rawSource)) errors.push(`${prefix}.source_invalid`)
      const itemSource = rawSource as EvidenceUnderstandingDraft['source']
      return {
        draft_id: text(item?.draft_id) || `evidence-draft-${index + 1}`,
        material_id: materialId,
        title,
        evidence_type: text(item?.evidence_type) || materialById.get(materialId)?.materialType || 'document',
        proof_purpose: proofPurpose,
        proof_relationship: proofRelationship,
        importance: importance as EvidenceUnderstandingDraft['importance'],
        legal_use: legalUse,
        source_material_ids: sourceMaterialIds,
        materials: linkedMaterials,
        summary: text(item?.summary),
        reasoning: text(item?.reasoning),
        confidence,
        source: itemSource,
        suggested_action: text(item?.suggested_action) as 'confirm_as_evidence',
      }
    })
    return errors.length > 0 ? { ok: false, errors } : { ok: true, drafts }
  }
}

export default EvidenceDraftValidator
