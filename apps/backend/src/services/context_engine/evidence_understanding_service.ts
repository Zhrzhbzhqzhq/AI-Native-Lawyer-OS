import { randomUUID } from 'node:crypto'
import path from 'node:path'
import type { PrismaClient } from '@lawdesk/database'
import ProviderManager from '../../ai/providerManager'
import { parseAIJson } from '../ai/parseAIJson'
import CaseUnderstandingProductService from './case_understanding_product_service'
import normalizeEvidenceDraftMaterialTitles from './evidence_draft_normalizer'
import EvidenceDraftValidator from './evidence_draft_validator'
import EvidenceUnderstandingArtifactStore from './evidence_understanding_artifact_store'
import { buildEvidenceUnderstandingPrompt, EVIDENCE_UNDERSTANDING_PROMPT_VERSION } from './evidence_understanding_prompt'
import MinimalContextBuilder from './minimal_context_builder'
import SafeMaterialReader from './safe_material_reader'

type Generator = { generate(promptPack: any): Promise<any> }
type EvidenceUnderstandingPrisma = Pick<PrismaClient, 'matter' | 'material' | 'aiRecord'>

export type EvidenceUnderstandingServiceOptions = {
  repositoryRoot?: string
  caseUnderstandingReader?: Pick<CaseUnderstandingProductService, 'latest'>
  contextBuilder?: Pick<MinimalContextBuilder, 'build'>
  generator?: Generator
  validator?: Pick<EvidenceDraftValidator, 'validate'>
  artifactStore?: Pick<EvidenceUnderstandingArtifactStore, 'createRun' | 'saveInput' | 'saveRawResponse' | 'saveResult'>
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
    ?? body
}

function parseResponse(response: unknown) {
  const content = responseContent(response)
  if (content && typeof content === 'object' && !Array.isArray(content)) return content
  return typeof content === 'string' ? parseAIJson(content).data : null
}

export class EvidenceUnderstandingService {
  private readonly caseUnderstandingReader: Pick<CaseUnderstandingProductService, 'latest'>
  private readonly contextBuilder: Pick<MinimalContextBuilder, 'build'>
  private readonly generator: Generator
  private readonly validator: Pick<EvidenceDraftValidator, 'validate'>
  private readonly artifactStore: Pick<EvidenceUnderstandingArtifactStore, 'createRun' | 'saveInput' | 'saveRawResponse' | 'saveResult'>

  constructor(private readonly prisma: EvidenceUnderstandingPrisma, options: EvidenceUnderstandingServiceOptions = {}) {
    const repositoryRoot = path.resolve(options.repositoryRoot || path.resolve(__dirname, '../../../../..'))
    this.caseUnderstandingReader = options.caseUnderstandingReader || new CaseUnderstandingProductService(prisma)
    this.contextBuilder = options.contextBuilder || new MinimalContextBuilder(
      prisma as Pick<PrismaClient, 'matter' | 'material'>,
      new SafeMaterialReader({ repositoryRoot }),
    )
    this.generator = options.generator || ProviderManager.getAdapter()
    this.validator = options.validator || new EvidenceDraftValidator()
    this.artifactStore = options.artifactStore || new EvidenceUnderstandingArtifactStore(repositoryRoot)
  }

  async generate(matterId: string) {
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
    const snapshot = await this.contextBuilder.build(normalizedMatterId)
    if (!snapshot.completeness.complete) throw serviceError('context_snapshot_incomplete')

    const runId = randomUUID()
    const run = await this.artifactStore.createRun(normalizedMatterId, runId)
    const input = {
      matterId: normalizedMatterId,
      caseUnderstandingAiRecordId: latestUnderstanding.aiRecordId,
      caseUnderstanding: latestUnderstanding.understanding,
      materials: snapshot.materials,
    }
    await this.artifactStore.saveInput(run, input)
    const model = process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3'
    await this.prisma.aiRecord.create({
      data: {
        ai_record_id: runId,
        matter_id: normalizedMatterId,
        ai_task_type: 'evidence_understanding_v1',
        model,
        prompt_uri: run.inputUri,
        status: 'running',
      },
    })

    const userPrompt = buildEvidenceUnderstandingPrompt(
      normalizedMatterId,
      latestUnderstanding.understanding,
      snapshot.materials,
    )
    let rawResponse: unknown = null
    try {
      rawResponse = await this.generator.generate({
        provider: 'minimax',
        model,
        prompt_version: EVIDENCE_UNDERSTANDING_PROMPT_VERSION,
        task: 'generate_evidence_drafts',
        matter_id: normalizedMatterId,
        max_completion_tokens: 5000,
        system_prompt: '你是 LawDesk Evidence Understanding Assistant。Case Understanding 仅用于案件定位，Material 正文是唯一证据来源。严格输出 JSON。',
        user_prompt: userPrompt,
        context_pack: input,
      })
      await this.artifactStore.saveRawResponse(run, { status: 'received', model, rawResponse })
      const parsedResponse = parseResponse(rawResponse)
      const normalizedResponse = normalizeEvidenceDraftMaterialTitles(parsedResponse, snapshot.materials)
      const validation = this.validator.validate(normalizedResponse, snapshot.materials)
      if (!validation.ok) throw serviceError('evidence_draft_contract_invalid')
      const envelope = {
        status: 'evidence_draft_ready' as const,
        matter_id: normalizedMatterId,
        ai_audit: { provider: 'minimax', model, prompt_version: EVIDENCE_UNDERSTANDING_PROMPT_VERSION },
        evidence_drafts: validation.drafts,
      }
      await this.artifactStore.saveResult(run, envelope)
      await this.prisma.aiRecord.update({
        where: { ai_record_id: runId },
        data: { status: 'completed', result_uri: run.resultUri },
      })
      return envelope
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
      if (code === 'evidence_draft_contract_invalid') throw error
      throw serviceError('evidence_understanding_generation_failed')
    }
  }
}

export default EvidenceUnderstandingService
