import type { PrismaClient } from '@lawdesk/database';
import MatterContextService from './matterContextService';

export class PromptBuilderService {
  prisma: PrismaClient;
  contextService: MatterContextService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.contextService = new MatterContextService(prisma);
  }

  async buildPromptPack(matter_id: string) {
    const ctx = await this.contextService.buildContext(matter_id);

    const system_prompt = `You are LawDesk AI Lawyer Assistant.\nYou assist a lawyer with the current Matter.\nYou must not invent facts.\nYou must distinguish facts, risks, suggestions, and unknowns.\nYou must ask for lawyer confirmation before action.`;

    const user_prompt = `Please analyze the provided Matter and: 1) Summarize the current Matter concisely. 2) Identify potential legal and factual risks. 3) Suggest practical next steps to move the Matter forward. 4) List missing materials or evidence needed. 5) Propose immediate actions the lawyer can take. Use the context provided and do not call any external systems.`;

    return {
      matter_id,
      system_prompt,
      user_prompt,
      context_pack: ctx,
      generated_at: new Date().toISOString(),
    } as const;
  }
}

export default PromptBuilderService;
