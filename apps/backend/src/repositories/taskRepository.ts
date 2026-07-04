import type { PrismaClient } from '@lawdesk/database';

export class TaskRepository {
  prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByMatterId(matter_id: string) {
    return this.prisma.task.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } });
  }

  async create(data: {
    task_id: string;
    matter_id: string;
    client_id?: string | null;
    material_id?: string | null;
    evidence_id?: string | null;
    document_id?: string | null;
    title: string;
    description?: string;
    priority?: string;
    due_date?: Date | string | null;
    status?: string;
  }) {
    const payload = {
      task_id: data.task_id,
      matter_id: data.matter_id,
      client_id: data.client_id ?? null,
      material_id: data.material_id ?? null,
      evidence_id: data.evidence_id ?? null,
      document_id: data.document_id ?? null,
      title: data.title,
      description: data.description ?? '',
      priority: data.priority ?? 'normal',
      due_date: data.due_date ?? null,
      status: data.status ?? 'open',
    };
    return this.prisma.task.create({ data: payload as any });
  }

  async updateByTaskId(task_id: string, patch: Record<string, any>) {
    return this.prisma.task.update({ where: { task_id }, data: patch as any });
  }

  async deleteByTaskId(task_id: string) {
    return this.prisma.task.delete({ where: { task_id } });
  }
}

export default TaskRepository;
