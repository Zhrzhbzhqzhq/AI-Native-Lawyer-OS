export type MinimalContextMatter = {
  matterId: string
  title: string
  description: string
  matterType: string
}

export type MinimalContextMaterial = {
  materialId: string
  title: string
  materialType: string
  source: string
  storageUri: string
  content: string
  contentLength: number
}

export type UnavailableContextMaterial = {
  materialId: string
  reason: string
}

export type MinimalMatterContextSnapshot = {
  contextVersion: 'context-engine-c0.1'
  matterId: string
  generatedAt: string
  sourceHash: string
  matter: MinimalContextMatter
  materials: MinimalContextMaterial[]
  completeness: {
    complete: boolean
    totalMaterials: number
    readableMaterials: number
    unavailableMaterials: UnavailableContextMaterial[]
  }
}

export type ContextMatterRow = {
  matter_id: string
  title?: string | null
  description?: string | null
  matter_type?: string | null
  status?: string | null
}

export type ContextMaterialRow = {
  material_id: string
  matter_id: string
  title?: string | null
  material_type?: string | null
  source?: string | null
  storage_uri?: string | null
  created_at?: Date | string | null
}

