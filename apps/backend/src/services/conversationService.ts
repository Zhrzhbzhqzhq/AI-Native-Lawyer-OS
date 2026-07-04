import type { PrismaClient } from '@lawdesk/database';
import ConversationRepository from '../repositories/conversationRepository';

export class ConversationService {
  repo: ConversationRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new ConversationRepository(prisma);
  }

  listByMatter(matter_id: string) {
    return this.repo.findByMatterId(matter_id);
  }

  createForMatter(matter_id: string, data: { message_id: string; role: 'user' | 'assistant' | 'system'; content: string }) {
    const payload = { ...data, matter_id } as any;
    return this.repo.create(payload as any);
  }

  deleteByMessageId(message_id: string) {
    return this.repo.deleteByMessageId(message_id);
  }
}

export default ConversationService;
