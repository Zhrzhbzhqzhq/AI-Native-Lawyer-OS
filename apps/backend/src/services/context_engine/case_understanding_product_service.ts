import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { PrismaClient } from '@lawdesk/database'
import CaseUnderstandingGenerator from './case_understanding_generator'
import type { CaseUnderstandingResult } from './case_understanding_schema'
import CaseUnderstandingValidator from './case_understanding_validator'
import ContextArtifactStore from './context_artifact_store'
import MinimalContextBuilder from './minimal_context_builder'
import SafeMaterialReader from './safe_material_reader'

const AI_TASK_TYPE = 'case_understanding_v1'

type ProductPrisma = Pick<PrismaClient, 'matter' | 'material' | 'aiRecord'>

export type CaseUnderstandingProductServiceOptions = {
  repositoryRoot?: string
  contextBuilder?: Pick<MinimalContextBuilder, 'build'>
  generator?: Pick<CaseUnderstandingGenerator, 'generate'>
  validator?: Pick<CaseUnderstandingValidator, 'validate'>
  artifactStore?: Pick<ContextArtifactStore, 'createRun' | 'saveContextSnapshot' | 'saveGeneration'>
}

function serviceError(code: string) {
  const error = new Error(code)
  ;(error as any).code = code
  return error
}

function defaultRepositoryRoot() {
  return path.resolve(__dirname, '../../../../..')
}

export class CaseUnderstandingProductService {
  private readonly repositoryRoot: string
  private readonly contextBuilder: Pick<MinimalContextBuilder, 'build'>
  private readonly generator: Pick<CaseUnderstandingGenerator, 'generate'>
  private readonly validator: Pick<CaseUnderstandingValidator, 'validate'>
  private readonly artifactStore: Pick<ContextArtifactStore, 'createRun' | 'saveContextSnapshot' | 'saveGeneration'>

  constructor(private readonly prisma: ProductPrisma, options: CaseUnderstandingProductServiceOptions = {}) {
    this.repositoryRoot = path.resolve(options.repositoryRoot || defaultRepositoryRoot())
    this.contextBuilder = options.contextBuilder || new MinimalContextBuilder(
      prisma as Pick<PrismaClient, 'matter' | 'material'>,
      new SafeMaterialReader({ repositoryRoot: this.repositoryRoot }),
    )
    this.generator = options.generator || new CaseUnderstandingGenerator()
    this.validator = options.validator || new CaseUnderstandingValidator()
    this.artifactStore = options.artifactStore || new ContextArtifactStore({ repositoryRoot: this.repositoryRoot })
  }

  async generate(matterId: string) {
    const normalizedMatterId = String(matterId || '').trim()
    if (!normalizedMatterId) throw serviceError('matter_id_required')
    const running = await this.prisma.aiRecord.findFirst({
      where: { matter_id: normalizedMatterId, ai_task_type: AI_TASK_TYPE, status: 'running' },
      select: { ai_record_id: true },
    })
    if (running) throw serviceError('case_understanding_already_running')

    const snapshot = await this.contextBuilder.build(normalizedMatterId)
    if (!snapshot.completeness.complete) throw serviceError('context_snapshot_incomplete')

    const aiRecordId = randomUUID()
    const run = await this.artifactStore.createRun(normalizedMatterId, aiRecordId)
    await this.artifactStore.saveContextSnapshot(run, snapshot)
    const model = process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3'
    await this.prisma.aiRecord.create({
      data: {
        ai_record_id: aiRecordId,
        matter_id: normalizedMatterId,
        ai_task_type: AI_TASK_TYPE,
        model,
        prompt_uri: run.artifacts.contextSnapshot,
        status: 'running',
      },
    })

    try {
      const generation = await this.generator.generate(snapshot)
      await this.artifactStore.saveGeneration(run, generation)
      if (!generation.ok) {
        await this.prisma.aiRecord.update({ where: { ai_record_id: aiRecordId }, data: { status: 'failed' } })
        throw serviceError('case_understanding_generation_failed')
      }
      const validation = this.validator.validate(generation.result)
      if (!validation.ok) {
        await this.prisma.aiRecord.update({ where: { ai_record_id: aiRecordId }, data: { status: 'failed' } })
        throw serviceError('case_understanding_contract_invalid')
      }
      const record = await this.prisma.aiRecord.update({
        where: { ai_record_id: aiRecordId },
        data: { status: 'completed', model: generation.model, result_uri: run.artifacts.caseUnderstanding },
      })
      return this.dto(record, validation.value)
    } catch (error) {
      await this.prisma.aiRecord.updateMany({
        where: { ai_record_id: aiRecordId, status: 'running' },
        data: { status: 'failed' },
      })
      throw error
    }
  }

  async latest(matterId: string) {
    const normalizedMatterId = String(matterId || '').trim()
    if (!normalizedMatterId) throw serviceError('matter_id_required')
    const matter = await this.prisma.matter.findFirst({
      where: { matter_id: normalizedMatterId, status: { not: 'deleted' } },
      select: { matter_id: true },
    })
    if (!matter) throw serviceError('matter_not_found')
    const record = await this.prisma.aiRecord.findFirst({
      where: { matter_id: normalizedMatterId, ai_task_type: AI_TASK_TYPE, status: 'completed' },
      orderBy: { created_at: 'desc' },
    })
    if (!record?.result_uri) throw serviceError('case_understanding_not_found')
    const result = await this.readResult(record.result_uri)
    const validation = this.validator.validate(result)
    if (!validation.ok) throw serviceError('case_understanding_contract_invalid')
    return this.dto(record, validation.value)
  }

  private async readResult(resultUri: string): Promise<unknown> {
    const artifactRoot = path.resolve(this.repositoryRoot, 'storage/context-engine-c0.1')
    const target = path.resolve(this.repositoryRoot, resultUri)
    if (target !== artifactRoot && !target.startsWith(`${artifactRoot}${path.sep}`)) {
      throw serviceError('case_understanding_result_uri_invalid')
    }
    return JSON.parse(await readFile(target, 'utf8'))
  }

  private dto(record: any, understanding: CaseUnderstandingResult) {
    return {
      aiRecordId: String(record.ai_record_id),
      matterId: String(record.matter_id),
      status: String(record.status),
      model: String(record.model || ''),
      generatedAt: record.updated_at instanceof Date ? record.updated_at.toISOString() : String(record.updated_at || ''),
      understanding,
    }
  }
}

export default CaseUnderstandingProductService
