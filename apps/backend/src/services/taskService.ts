import type { PrismaClient } from '@lawdesk/database';
import TaskRepository from '../repositories/taskRepository';
import { computeNextState, TaskEvent, TaskState } from './taskStateMachine';

export class TaskService {
  repo: TaskRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new TaskRepository(prisma);
  }

  listByMatter(matter_id: string) {
    return this.repo.findByMatterId(matter_id);
  }

  createForMatter(matter_id: string, data: { task_id: string; title: string; description?: string; priority?: string; due_date?: Date | string | null; status?: string; client_id?: string | null; material_id?: string | null; evidence_id?: string | null; document_id?: string | null }) {
    const payload = { ...data, matter_id } as any;
    return this.repo.create(payload as any);
  }

  updateByTaskId(task_id: string, patch: Record<string, any>) {
    return this.repo.updateByTaskId(task_id, patch);
  }

  deleteByTaskId(task_id: string) {
    return this.repo.deleteByTaskId(task_id);
  }

  // transitionTaskStatus: validate transition and update Task.status
  async transitionTaskStatus(task_id: string, event: TaskEvent): Promise<TaskState> {
    if (!task_id) throw new Error('task_id required')

    // read current task directly (Repository lacks findByTaskId)
    const task = await this.repo.prisma.task.findUnique({ where: { task_id } })
    if (!task) throw new Error(`task not found: ${task_id}`)

    const current = (task.status as TaskState) || 'waiting_materials'

    let next: TaskState
    try {
      next = computeNextState(current, event)
    } catch (e: any) {
      throw new Error(`invalid transition: ${e.message}`)
    }

    // perform update using repository
    await this.repo.updateByTaskId(task_id, { status: next })
    return next
  }
}

export default TaskService;
