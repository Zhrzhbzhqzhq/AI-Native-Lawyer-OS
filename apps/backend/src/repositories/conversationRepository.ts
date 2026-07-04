import type { PrismaClient } from '@lawdesk/database';

export class ConversationRepository {
  prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByMatterId(matter_id: string) {
    return this.prisma.aiRecord.findMany({ where: { matter_id, ai_task_type: 'conversation' }, orderBy: { created_at: 'asc' } });
  }

  async create(data: { message_id: string; matter_id: string; role: 'user' | 'assistant' | 'system'; content: string }) {
    const payload = {
      ai_task_type: 'conversation',
      ai_record_id: data.message_id,
      matter_id: data.matter_id,
      model: data.role,
      prompt_uri: data.content,
      result_uri: data.content,
      status: 'ok',
    } as any
    return this.prisma.aiRecord.create({ data: payload })
  }

  async deleteByMessageId(message_id: string) {
    return this.prisma.aiRecord.delete({ where: { ai_record_id: message_id } })
  }
}

export default ConversationRepository;
