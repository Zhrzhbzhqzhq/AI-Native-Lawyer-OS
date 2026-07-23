import type { MinimalContextMaterial } from './context_types'

function normalizedDrafts(value: unknown, materials: MinimalContextMaterial[]) {
  if (!Array.isArray(value)) return value
  const materialTitleById = new Map(materials.map((material) => [material.materialId, material.title]))

  return value.map((draft) => {
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return draft
    const source = draft as Record<string, unknown>
    if (!Array.isArray(source.materials)) return draft

    return {
      ...source,
      materials: source.materials.map((linked) => {
        if (!linked || typeof linked !== 'object' || Array.isArray(linked)) return linked
        const linkedMaterial = linked as Record<string, unknown>
        const materialId = typeof linkedMaterial.material_id === 'string' ? linkedMaterial.material_id.trim() : ''
        const originalTitle = materialTitleById.get(materialId)
        return originalTitle === undefined ? linked : { ...linkedMaterial, title: originalTitle }
      }),
    }
  })
}

export function normalizeEvidenceDraftMaterialTitles(value: unknown, materials: MinimalContextMaterial[]): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return normalizedDrafts(value, materials)
  }

  const envelope = value as Record<string, unknown>
  if (!Array.isArray(envelope.evidence_drafts)) return value
  return { ...envelope, evidence_drafts: normalizedDrafts(envelope.evidence_drafts, materials) }
}

export default normalizeEvidenceDraftMaterialTitles
