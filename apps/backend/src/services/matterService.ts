import type { PrismaClient } from '@lawdesk/database';
import MatterRepository from '../repositories/matterRepository';
import TaskRepository from '../repositories/taskRepository';
import * as matterEngine from './matter/matterEngine';
import * as stages from './matter/matterStage';

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

    // map Matter.status to MatterStage
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
      if (s === 'closed' || s === 'archived') return stages.CLOSED
      return stages.INTAKE
    }

    const currentStage = mapStatusToStage(matter.status)

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
}

export default MatterService;
