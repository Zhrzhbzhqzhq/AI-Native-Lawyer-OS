import { randomUUID } from 'node:crypto'
import path from 'node:path'
import type { PrismaClient } from '@lawdesk/database'
import ProviderManager from '../../ai/providerManager'
import { createAIAudit, readAIAudit, type AIAudit } from '../ai/aiAudit'
import { parseAIJson } from '../ai/parseAIJson'
import CaseUnderstandingProductService from './case_understanding_product_service'
import FactUnderstandingArtifactStore from './fact_understanding_artifact_store'
import {
  buildFactUnderstandingPrompt,
  FACT_UNDERSTANDING_PROMPT_VERSION,
  type FactUnderstandingEvidenceInput,
} from './fact_understanding_prompt'
import FactUnderstandingValidator, { type FactUnderstandingDraft } from './fact_understanding_validator'
import SafeMaterialReader from './safe_material_reader'

type Generator = { generate(promptPack: any): Promise<any> }
type FactUnderstandingPrisma = Pick<PrismaClient, 'matter' | 'material' | 'evidence' | 'aiRecord'>

export type FactUnderstandingServiceOptions = {
  repositoryRoot?: string
  caseUnderstandingReader?: Pick<CaseUnderstandingProductService, 'latest'>
  materialReader?: Pick<SafeMaterialReader, 'read'>
  generator?: Generator
  validator?: Pick<FactUnderstandingValidator, 'validate'>
  artifactStore?: Pick<FactUnderstandingArtifactStore, 'createRun' | 'saveInput' | 'saveRawResponse' | 'saveResult'>
}

export type FactUnderstandingGeneration = {
  suggestions: FactUnderstandingDraft[]
  aiAudit: AIAudit
}

function serviceError(code: string) {
  const error = new Error(code)
  ;(error as any).code = code
  return error
}

function responseContent(response: any): unknown {
  const body = response?.response !== undefined ? response.response : response
  return body?.choices?.[0]?.message?.content
    ?? body?.data?.choices?.[0]?.message?.content
    ?? (Array.isArray(body?.content)
      ? body.content.map((block: any) => typeof block === 'string' ? block : block?.text).filter(Boolean).join('\n')
      : body)
}

function parseResponse(response: unknown) {
  const content = responseContent(response)
  if (content && typeof content === 'object') return content
  return typeof content === 'string' ? parseAIJson(content).data : null
}

export class FactUnderstandingService {
  private readonly caseUnderstandingReader: Pick<CaseUnderstandingProductService, 'latest'>
  private readonly materialReader: Pick<SafeMaterialReader, 'read'>
  private readonly generator: Generator
  private readonly validator: Pick<FactUnderstandingValidator, 'validate'>
  private readonly artifactStore: Pick<FactUnderstandingArtifactStore, 'createRun' | 'saveInput' | 'saveRawResponse' | 'saveResult'>

  constructor(private readonly prisma: FactUnderstandingPrisma, options: FactUnderstandingServiceOptions = {}) {
    const repositoryRoot = path.resolve(options.repositoryRoot || path.resolve(__dirname, '../../../../..'))
    this.caseUnderstandingReader = options.caseUnderstandingReader || new CaseUnderstandingProductService(prisma)
    this.materialReader = options.materialReader || new SafeMaterialReader({ repositoryRoot })
    this.generator = options.generator || ProviderManager.getAdapter()
    this.validator = options.validator || new FactUnderstandingValidator()
    this.artifactStore = options.artifactStore || new FactUnderstandingArtifactStore(repositoryRoot)
  }

  async generate(matterId: string): Promise<FactUnderstandingGeneration> {
    const normalizedMatterId = String(matterId || '').trim()
    if (!normalizedMatterId) throw serviceError('matter_id_required')

    let latestUnderstanding: Awaited<ReturnType<CaseUnderstandingProductService['latest']>>
    try {
      latestUnderstanding = await this.caseUnderstandingReader.latest(normalizedMatterId)
    } catch (error) {
      const code = String((error as any)?.code || (error as any)?.message || '')
      if (code === 'case_understanding_not_found') throw serviceError('case_understanding_required')
      throw error
    }

    const evidenceRows = await this.prisma.evidence.findMany({
      where: { matter_id: normalizedMatterId, status: { not: 'rejected' } },
      include: { material: true },
      orderBy: { created_at: 'asc' },
    }) as any[]
    if (evidenceRows.length === 0) throw serviceError('formal_evidence_required')

    const materialContent = new Map<string, string>()
    const evidences: FactUnderstandingEvidenceInput[] = []
    for (const evidence of evidenceRows) {
      const material = evidence.material
      const materialId = String(evidence.material_id || '')
      if (!material || String(evidence.matter_id) !== normalizedMatterId || String(material.matter_id) !== normalizedMatterId || String(material.material_id) !== materialId) {
        throw serviceError('evidence_source_material_not_in_matter')
      }
      let content = materialContent.get(materialId)
      if (content === undefined) {
        try {
          content = (await this.materialReader.read(String(material.storage_uri || ''))).content
        } catch {
          throw serviceError('evidence_source_material_unavailable')
        }
        materialContent.set(materialId, content)
      }
      evidences.push({
        evidenceId: String(evidence.evidence_id || ''),
        title: String(evidence.title || ''),
        description: String(evidence.description || ''),
        relevance: String(evidence.relevance || ''),
        evidenceType: String(evidence.evidence_type || ''),
        status: String(evidence.status || ''),
        material: {
          materialId,
          title: String(material.title || ''),
          materialType: String(material.material_type || ''),
          source: String(material.source || ''),
          content,
        },
      })
    }

    const runId = randomUUID()
    const run = await this.artifactStore.createRun(normalizedMatterId, runId)
    const input = {
      matterId: normalizedMatterId,
      caseUnderstandingAiRecordId: latestUnderstanding.aiRecordId,
      caseUnderstanding: latestUnderstanding.understanding,
      formalEvidence: evidences,
    }
    await this.artifactStore.saveInput(run, input)
    const model = process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3'
    await this.prisma.aiRecord.create({
      data: {
        ai_record_id: runId,
        matter_id: normalizedMatterId,
        ai_task_type: 'fact_understanding_v1',
        model,
        prompt_uri: run.inputUri,
        status: 'running',
      },
    })

    const userPrompt = buildFactUnderstandingPrompt(normalizedMatterId, latestUnderstanding.understanding, evidences)
    let rawResponse: unknown = null
    try {
      rawResponse = await this.generator.generate({
        provider: 'minimax',
        model,
        prompt_version: FACT_UNDERSTANDING_PROMPT_VERSION,
        task: 'generate_fact_drafts',
        matter_id: normalizedMatterId,
        max_completion_tokens: 5000,
        system_prompt: '你是 LawDesk Fact Understanding Assistant。Case Understanding 仅用于案件定位，Formal Evidence 及其 Material 正文是事实来源。严格输出 JSON。',
        user_prompt: userPrompt,
        context_pack: input,
      })
      await this.artifactStore.saveRawResponse(run, { status: 'received', model, rawResponse })
      const validation = this.validator.validate(parseResponse(rawResponse), evidences)
      if (!validation.ok) throw serviceError('fact_draft_contract_invalid')
      await this.artifactStore.saveResult(run, { matter_id: normalizedMatterId, fact_drafts: validation.drafts })
      await this.prisma.aiRecord.update({
        where: { ai_record_id: runId },
        data: { status: 'completed', result_uri: run.resultUri },
      })
      return {
        suggestions: validation.drafts,
        aiAudit: readAIAudit(rawResponse) || createAIAudit('minimax', model, FACT_UNDERSTANDING_PROMPT_VERSION),
      }
    } catch (error) {
      if (rawResponse === null) {
        await this.artifactStore.saveRawResponse(run, {
          status: 'failed',
          model,
          rawResponse: null,
          error: error instanceof Error ? error.message : String(error),
        })
      }
      await this.prisma.aiRecord.updateMany({
        where: { ai_record_id: runId, status: 'running' },
        data: { status: 'failed' },
      })
      const code = String((error as any)?.code || (error as any)?.message || '')
      if (code === 'fact_draft_contract_invalid') throw error
      throw serviceError('fact_understanding_generation_failed')
    }
  }
}

export default FactUnderstandingService
