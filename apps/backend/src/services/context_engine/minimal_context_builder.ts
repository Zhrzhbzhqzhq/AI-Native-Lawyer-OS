import { createHash } from 'node:crypto'
import type { PrismaClient } from '@lawdesk/database'
import type {
  ContextMaterialRow,
  ContextMatterRow,
  MinimalContextMaterial,
  MinimalMatterContextSnapshot,
  UnavailableContextMaterial,
} from './context_types'
import SafeMaterialReader from './safe_material_reader'

type MinimalContextPrisma = Pick<PrismaClient, 'matter' | 'material'>

function errorCode(error: unknown) {
  const candidate = error as { code?: unknown; message?: unknown }
  return String(candidate?.code || candidate?.message || 'material_file_unavailable')
}

function sourceHash(
  matter: MinimalMatterContextSnapshot['matter'],
  materials: MinimalContextMaterial[],
  unavailableMaterials: UnavailableContextMaterial[],
) {
  return createHash('sha256').update(JSON.stringify({
    matter,
    materials: materials.map((material) => ({
      materialId: material.materialId,
      title: material.title,
      materialType: material.materialType,
      source: material.source,
      storageUri: material.storageUri,
      content: material.content,
    })),
    unavailableMaterials,
  })).digest('hex')
}

export class MinimalContextBuilder {
  constructor(
    private readonly prisma: MinimalContextPrisma,
    private readonly materialReader: Pick<SafeMaterialReader, 'read'> = new SafeMaterialReader(),
  ) {}

  async build(matterId: string): Promise<MinimalMatterContextSnapshot> {
    const normalizedMatterId = String(matterId || '').trim()
    if (!normalizedMatterId) throw new Error('matter_id_required')

    const matter = await this.prisma.matter.findFirst({
      where: { matter_id: normalizedMatterId, status: { not: 'deleted' } },
    }) as ContextMatterRow | null
    if (!matter) throw new Error('matter_not_found')

    const rows = await this.prisma.material.findMany({
      where: { matter_id: normalizedMatterId },
      orderBy: [{ created_at: 'asc' }, { material_id: 'asc' }],
    }) as ContextMaterialRow[]
    const isolatedRows = rows.filter((material) => String(material.matter_id) === normalizedMatterId)

    const materials: MinimalContextMaterial[] = []
    const unavailableMaterials: UnavailableContextMaterial[] = []
    for (const material of isolatedRows) {
      const materialId = String(material.material_id || '')
      try {
        const result = await this.materialReader.read(String(material.storage_uri || ''))
        materials.push({
          materialId,
          title: String(material.title || ''),
          materialType: String(material.material_type || ''),
          source: String(material.source || ''),
          storageUri: result.storageUri,
          content: result.content,
          contentLength: result.contentLength,
        })
      } catch (error) {
        unavailableMaterials.push({ materialId, reason: errorCode(error) })
      }
    }

    const contextMatter = {
      matterId: normalizedMatterId,
      title: String(matter.title || ''),
      description: String(matter.description || ''),
      matterType: String(matter.matter_type || ''),
    }
    const completeness = {
      complete: isolatedRows.length > 0 && unavailableMaterials.length === 0,
      totalMaterials: isolatedRows.length,
      readableMaterials: materials.length,
      unavailableMaterials,
    }

    return {
      contextVersion: 'context-engine-c0.1',
      matterId: normalizedMatterId,
      generatedAt: new Date().toISOString(),
      sourceHash: sourceHash(contextMatter, materials, unavailableMaterials),
      matter: contextMatter,
      materials,
      completeness,
    }
  }
}

export default MinimalContextBuilder
