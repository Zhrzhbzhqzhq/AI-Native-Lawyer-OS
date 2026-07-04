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

    // build snapshot_facts (pure facts, no analysis)
    const snapshot_facts = {
      matter_id: matter?.matter_id || null,
      counts: {
        tasks: tasks.total,
        documents: documents.total,
        evidence: evidence.total,
        research: research.total,
        timeline: timeline.total,
      },
      documents: {
        draft: documents.draft,
        final: documents.final,
        archived: (ctx.graph?.documents || []).filter((d:any) => String(d?.status || '').toLowerCase() === 'archived').length,
      },
      evidence: {
        weak: Array.isArray(evidence.items) ? evidence.items.filter((e:any) => (String(e.relevance || '').trim() === '' || String(e.description || '').trim() === '')).length : 0,
      },
      activity: {
        recent: typeof timeline.total === 'number' ? timeline.total : (Array.isArray(timeline.recent) ? timeline.recent.length : 0),
      },
      generated_at: new Date().toISOString(),
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
      snapshot_facts,
      generated_at: new Date().toISOString(),
    };
  }
}

export default MatterSnapshotRuntime;
