import type { PrismaClient } from '@lawdesk/database';
import MatterRepository from '../repositories/matterRepository';
import TaskRepository from '../repositories/taskRepository';
import * as matterEngine from './matter/matterEngine';
import * as stages from './matter/matterStage';
import type { MatterStage } from './matter/matterStage';

export class MatterService {
  repo: MatterRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new MatterRepository(prisma);
  }

  list() {
    return this.repo.findAll();
  }

  get(matter_id: string) {
    return this.repo.findByMatterId(matter_id);
  }

  create(data: { matter_id: string; title: string; description?: string; matter_type?: string }) {
    const payload = { ...data, status: 'active' };
    return this.repo.create(payload as any);
  }

  update(matter_id: string, patch: Partial<any>) {
    return this.repo.updateByMatterId(matter_id, patch);
  }

  remove(matter_id: string) {
    return this.repo.softDelete(matter_id);
  }

  // processMatterEvent: read-only orchestration that consults MatterEngine
  async processMatterEvent(matter_id: string, event: string) {
    if (!matter_id) throw new Error('matter_id required')

    const matter = await this.repo.findByMatterId(matter_id)
    if (!matter) throw new Error(`matter not found: ${matter_id}`)

    // map a persisted `matter.stage` string to MatterStage (preferred)
    const mapPersistedStageToStage = (stage?: string) => {
      if (!stage) return stages.INTAKE
      const s = stage.toLowerCase()
      if (s === 'intake') return stages.INTAKE
      if (s === 'evidence_collection' || s === 'evidence') return stages.EVIDENCE
      if (s === 'research' || s === 'litigation_preparation') return stages.RESEARCH
      if (s === 'drafting') return stages.DOCUMENTS
      if (s === 'litigation' || s === 'trial') return stages.LITIGATION
      if (s === 'execution') return stages.EXECUTION
      if (s === 'closing' || s === 'review') return stages.CLOSING
      if (s === 'closed' || s === 'archived') return stages.CLOSED
      return stages.INTAKE
    }

    // map Matter.status to MatterStage as a fallback, but do NOT treat
    // generic lifecycle statuses (active, accepted, paused, progressing, closed)
    // as business stages. closed/archived should only map to CLOSED when they
    // appear in the persisted `matter.stage` field.
    const mapStatusToStage = (status?: string) => {
      if (!status) return stages.INTAKE
      const s = status.toLowerCase()
      if (s === 'intake') return stages.INTAKE
      if (s === 'evidence_collection' || s === 'evidence') return stages.EVIDENCE
      if (s === 'research' || s === 'litigation_preparation') return stages.RESEARCH
      if (s === 'drafting') return stages.DOCUMENTS
      if (s === 'litigation' || s === 'trial') return stages.LITIGATION
      if (s === 'execution') return stages.EXECUTION
      if (s === 'closing' || s === 'review') return stages.CLOSING
      // Note: do NOT map 'closed' or 'archived' from status -> stage here
      return stages.INTAKE
    }

    // Decide currentStage: prefer persisted `matter.stage` when present.
    const currentStage = matter.stage ? mapPersistedStageToStage(matter.stage) : mapStatusToStage(matter.status)

    // read tasks for this matter (no writes)
    const taskRepo = new TaskRepository((this.repo as any).prisma)
    const tasks = await taskRepo.findByMatterId(matter_id)
    const taskStatuses = Array.isArray(tasks) ? tasks.map((t: any) => t.status) : []

    const nextStage = matterEngine.handleEvent(currentStage, event)
    const shouldAdvance = matterEngine.shouldAdvanceStage(currentStage, taskStatuses)
    const stageTasks = matterEngine.createStageTasks(nextStage)

    return {
      currentStage,
      nextStage,
      shouldAdvance,
      stageTasks,
    }
  }

  // advanceMatterStage: persist stage when engine indicates safe to advance
  async advanceMatterStage(matter_id: string, event: string) {
    if (!matter_id) throw new Error('matter_id required')

    const result = await this.processMatterEvent(matter_id, event)

    if (!result.shouldAdvance) {
      return { ...result, persisted: false }
    }

    const { nextStage, currentStage } = result

    if (nextStage === currentStage) {
      return { ...result, persisted: false }
    }

    // map nextStage back to matter.stage string (persisted field 'stage' in V1)
    const mapStageToStage = (stage: string) => {
      switch (stage) {
        case stages.INTAKE:
          return 'intake'
        case stages.EVIDENCE:
          return 'evidence_collection'
        case stages.RESEARCH:
          return 'litigation_preparation'
        case stages.DOCUMENTS:
          return 'drafting'
        case stages.LITIGATION:
          return 'litigation'
        case stages.EXECUTION:
          return null // unsupported in V1
        case stages.CLOSING:
          return 'closing'
        case stages.CLOSED:
          return 'closed'
        default:
          return 'intake'
      }
    }

    const mappedStage = mapStageToStage(nextStage)
    if (!mappedStage) {
      return { ...result, persisted: false, reason: 'execution stage not persisted in V1' }
    }

    // Persist only `stage` (nullable) in V2 migration; do not touch `status`.
    let updateResult: any = null
    try {
      updateResult = await this.repo.updateByMatterId(matter_id, { stage: mappedStage } as any)
    } catch (err) {
      // Do not call bootstrap when update fails; surface as not persisted
      return { ...result, persisted: false, reason: 'matter_stage_update_failed', cause: err }
    }

    // If persisted successfully, attempt to bootstrap tasks for the new stage.
    // Use existing bootstrapStageTasks logic; it will skip already-existing tasks.
    try {
      const bootstrapResult = await this.bootstrapStageTasks(matter_id, nextStage)
      return { ...result, persisted: true, bootstrap: bootstrapResult }
    } catch (err) {
      // Per spec: do NOT rollback stage; surface explicit error with cause
      const e: any = new Error('matter_stage_persisted_but_task_bootstrap_failed')
      e.cause = err
      throw e
    }
  }

  // bootstrapStageTasks: create default tasks for a given stage if missing
  async bootstrapStageTasks(matter_id: string, stage: MatterStage) {
    if (!matter_id) throw new Error('matter_id required')

    const matter = await this.repo.findByMatterId(matter_id)
    if (!matter) throw new Error(`matter not found: ${matter_id}`)

    // determine default titles from engine
    const titles: string[] = matterEngine.createStageTasks(stage)
    if (!titles || titles.length === 0) {
      return { created: [], skipped: [] }
    }

    const taskRepo = new TaskRepository((this.repo as any).prisma)
    const existing = await taskRepo.findByMatterId(matter_id)
    const existingTitles = new Set(Array.isArray(existing) ? existing.map((t: any) => t.title) : [])

    const toCreate = titles.filter(t => !existingTitles.has(t))
    const created: any[] = []
    const skipped: string[] = titles.filter(t => existingTitles.has(t))

    for (const title of toCreate) {
      const taskId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const payload = {
        task_id: taskId,
        title,
        description: '',
        priority: 'normal',
        status: 'ready_to_start',
      }
      const c = await taskRepo.create({ ...payload, matter_id })
      created.push(c)
    }

    return { created, skipped }
  }
}

export default MatterService;
