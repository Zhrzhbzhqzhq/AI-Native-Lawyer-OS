import { randomUUID } from 'node:crypto'
import path from 'node:path'
import type { PrismaClient } from '@lawdesk/database'
import ProviderManager from '../../ai/providerManager'
import { createAIAudit, readAIAudit, type AIAudit } from '../ai/aiAudit'
import { parseAIJson } from '../ai/parseAIJson'
import CaseUnderstandingProductService from './case_understanding_product_service'
import IssueUnderstandingArtifactStore from './issue_understanding_artifact_store'
import {
  buildIssueUnderstandingPrompt,
  ISSUE_UNDERSTANDING_PROMPT_VERSION,
  type IssueUnderstandingFactInput,
} from './issue_understanding_prompt'
import IssueUnderstandingValidator, { type IssueUnderstandingDraft } from './issue_understanding_validator'
import SafeMaterialReader from './safe_material_reader'

type Generator = { generate(promptPack: any): Promise<any> }
type IssueUnderstandingPrisma = Pick<PrismaClient, 'matter' | 'material' | 'fact' | 'factEvidence' | 'aiRecord'>

export type IssueUnderstandingServiceOptions = {
  repositoryRoot?: string
  caseUnderstandingReader?: Pick<CaseUnderstandingProductService, 'latest'>
  materialReader?: Pick<SafeMaterialReader, 'read'>
  generator?: Generator
  validator?: Pick<IssueUnderstandingValidator, 'validate'>
  artifactStore?: Pick<IssueUnderstandingArtifactStore, 'createRun' | 'saveInput' | 'saveRawResponse' | 'saveResult'>
}

export type IssueUnderstandingGeneration = {
  suggestions: IssueUnderstandingDraft[]
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

export class IssueUnderstandingService {
  private readonly caseUnderstandingReader: Pick<CaseUnderstandingProductService, 'latest'>
  private readonly materialReader: Pick<SafeMaterialReader, 'read'>
  private readonly generator: Generator
  private readonly validator: Pick<IssueUnderstandingValidator, 'validate'>
  private readonly artifactStore: Pick<IssueUnderstandingArtifactStore, 'createRun' | 'saveInput' | 'saveRawResponse' | 'saveResult'>

  constructor(private readonly prisma: IssueUnderstandingPrisma, options: IssueUnderstandingServiceOptions = {}) {
    const repositoryRoot = path.resolve(options.repositoryRoot || path.resolve(__dirname, '../../../../..'))
    this.caseUnderstandingReader = options.caseUnderstandingReader || new CaseUnderstandingProductService(prisma)
    this.materialReader = options.materialReader || new SafeMaterialReader({ repositoryRoot })
    this.generator = options.generator || ProviderManager.getAdapter()
    this.validator = options.validator || new IssueUnderstandingValidator()
    this.artifactStore = options.artifactStore || new IssueUnderstandingArtifactStore(repositoryRoot)
  }

  async generate(matterId: string): Promise<IssueUnderstandingGeneration> {
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

    const factRows = await this.prisma.fact.findMany({
      where: { matter_id: normalizedMatterId, status: { not: 'rejected' } },
      orderBy: { created_at: 'asc' },
    }) as any[]
    if (factRows.length === 0) throw serviceError('formal_facts_required')

    const factIds = factRows.map((fact) => String(fact.fact_id || '')).filter(Boolean)
    const links = await this.prisma.factEvidence.findMany({
      where: { fact_id: { in: factIds } },
      include: { evidence: { include: { material: true } } },
      orderBy: { created_at: 'asc' },
    }) as any[]
    const linksByFact = new Map<string, any[]>()
    for (const link of links) {
      const factId = String(link.fact_id || '')
      if (!factIds.includes(factId)) throw serviceError('issue_source_fact_not_in_matter')
      const evidence = link.evidence
      if (!evidence || String(evidence.status || '') === 'rejected') continue
      const material = evidence.material
      if (String(evidence.matter_id || '') !== normalizedMatterId
        || !material
        || String(material.matter_id || '') !== normalizedMatterId
        || String(material.material_id || '') !== String(evidence.material_id || '')) {
        throw serviceError('issue_source_material_not_in_matter')
      }
      const current = linksByFact.get(factId) || []
      current.push(link)
      linksByFact.set(factId, current)
    }

    const materialContent = new Map<string, string>()
    const facts: IssueUnderstandingFactInput[] = []
    for (const fact of factRows) {
      const factId = String(fact.fact_id || '')
      const evidenceSources: IssueUnderstandingFactInput['evidenceSources'] = []
      for (const link of linksByFact.get(factId) || []) {
        const evidence = link.evidence
        const material = evidence.material
        const materialId = String(material.material_id || '')
        let content = materialContent.get(materialId)
        if (content === undefined) {
          try {
            content = (await this.materialReader.read(String(material.storage_uri || ''))).content
          } catch {
            throw serviceError('issue_source_material_unavailable')
          }
          materialContent.set(materialId, content)
        }
        evidenceSources.push({
          evidenceId: String(evidence.evidence_id || ''),
          title: String(evidence.title || ''),
          description: String(evidence.description || ''),
          relevance: String(evidence.relevance || ''),
          evidenceType: String(evidence.evidence_type || ''),
          material: {
            materialId,
            title: String(material.title || ''),
            materialType: String(material.material_type || ''),
            source: String(material.source || ''),
            content,
          },
        })
      }
      facts.push({
        factId,
        title: String(fact.title || ''),
        description: String(fact.description || ''),
        status: String(fact.status || ''),
        evidenceSources,
      })
    }
    if (!facts.some((fact) => fact.evidenceSources.length > 0)) throw serviceError('evidence_backed_formal_facts_required')

    const runId = randomUUID()
    const run = await this.artifactStore.createRun(normalizedMatterId, runId)
    const input = {
      matterId: normalizedMatterId,
      caseUnderstandingAiRecordId: latestUnderstanding.aiRecordId,
      caseUnderstanding: latestUnderstanding.understanding,
      formalFacts: facts,
    }
    await this.artifactStore.saveInput(run, input)
    const model = process.env.MINIMAX_MODEL || process.env.AI_MODEL || 'MiniMax-M3'
    await this.prisma.aiRecord.create({
      data: {
        ai_record_id: runId,
        matter_id: normalizedMatterId,
        ai_task_type: 'issue_understanding_v1',
        model,
        prompt_uri: run.inputUri,
        status: 'running',
      },
    })

    const userPrompt = buildIssueUnderstandingPrompt(normalizedMatterId, latestUnderstanding.understanding, facts)
    let rawResponse: unknown = null
    try {
      rawResponse = await this.generator.generate({
        provider: 'minimax',
        model,
        prompt_version: ISSUE_UNDERSTANDING_PROMPT_VERSION,
        task: 'generate_issue_drafts',
        matter_id: normalizedMatterId,
        max_completion_tokens: 5000,
        system_prompt: '你是 LawDesk Issue Understanding Assistant。Formal Facts 是 Issue 的事实来源，Evidence 与 Material 正文用于核验来源边界。严格输出 JSON。',
        user_prompt: userPrompt,
        context_pack: input,
      })
      await this.artifactStore.saveRawResponse(run, { status: 'received', model, rawResponse })
      const validation = this.validator.validate(parseResponse(rawResponse), facts)
      if (!validation.ok) throw serviceError('issue_draft_contract_invalid')
      await this.artifactStore.saveResult(run, { matter_id: normalizedMatterId, issue_drafts: validation.drafts })
      await this.prisma.aiRecord.update({
        where: { ai_record_id: runId },
        data: { status: 'completed', result_uri: run.resultUri },
      })
      return {
        suggestions: validation.drafts,
        aiAudit: readAIAudit(rawResponse) || createAIAudit('minimax', model, ISSUE_UNDERSTANDING_PROMPT_VERSION),
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
      if (code === 'issue_draft_contract_invalid') throw error
      throw serviceError('issue_understanding_generation_failed')
    }
  }
}

export default IssueUnderstandingService

