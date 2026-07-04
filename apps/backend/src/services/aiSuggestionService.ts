import type { PrismaClient } from '@lawdesk/database';
import PromptBuilderService from './promptBuilderService';
import ProviderManager from '../ai/providerManager';

export class AiSuggestionService {
  prisma: PrismaClient;
  promptBuilder: PromptBuilderService;
  adapter: any;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.promptBuilder = new PromptBuilderService(prisma);
    this.adapter = ProviderManager.getAdapter();
  }

  async suggestForMatter(matter_id: string) {
    const promptPack = await this.promptBuilder.buildPromptPack(matter_id);
    const resp = await this.adapter.generate(promptPack);
    return resp;
  }
}

export default AiSuggestionService;
