import type { PrismaClient } from '@lawdesk/database';
import ContextBuilder from './contextBuilder';
import MatterStateEngine from './matterStateEngine';

export class MatterSnapshotRuntime {
  contextBuilder: ContextBuilder;

  constructor(prisma: PrismaClient) {
    this.contextBuilder = new ContextBuilder(prisma);
  }

  async build(matterId: string) {
    const ctx = await this.contextBuilder.build(matterId);

    const matter = ctx.graph?.matter || null;

    // workflow will be computed after building tasks/documents/evidence/research

    const tasks = {
      total: (ctx.graph?.tasks || []).length,
      open: (ctx.graph?.tasks || []).filter((t:any)=>!['completed','done','closed'].includes(String(t?.status||'').toLowerCase())).length,
      completed: (ctx.graph?.tasks || []).filter((t:any)=>['completed','done','closed'].includes(String(t?.status||'').toLowerCase())).length,
      items: ctx.graph?.tasks || [],
    };

    const documents = {
      total: (ctx.graph?.documents || []).length,
      draft: (ctx.graph?.documents || []).filter((d:any)=>!['final','completed','archived'].includes(String(d?.status||'').toLowerCase())).length,
      final: (ctx.graph?.documents || []).filter((d:any)=>['final','completed'].includes(String(d?.status||'').toLowerCase())).length,
      items: ctx.graph?.documents || [],
    };

    const evidence = { total: (ctx.graph?.evidence||[]).length, items: ctx.graph?.evidence || [] };
    const research = { total: (ctx.graph?.research||[]).length, items: ctx.graph?.research || [] };

    // compute workflow using state engine
    const snapshotLike = {
      matter,
      tasks,
      documents,
      evidence,
      research,
    } as any

    const workflow = MatterStateEngine.evaluate(snapshotLike as any)

    const timeline = { total: (ctx.graph?.timeline||[]).length, recent: (ctx.recentTimeline||ctx.graph?.timeline||[]).slice(0,10) };

    const ai = {
      last_plan: null,
      last_summary: ctx.summary || null,
      next_action: null,
    };

    // compute intelligence using MatterIntelligenceEngine
    try {
      // lazy import to avoid cycles
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const MatterIntelligenceEngine = require('./matterIntelligenceEngine').default
      const intelligenceOut: any = MatterIntelligenceEngine.evaluate(snapshotLike as any, workflow)
      // attach intelligence
      ;(ai as any).intelligence = intelligenceOut
    } catch (e) {
      (ai as any).intelligence = null
    }

    return {
      matter,
      workflow,
      tasks,
      documents,
      evidence,
      research,
      timeline,
      ai,
      generated_at: new Date().toISOString(),
    };
  }
}

export default MatterSnapshotRuntime;
