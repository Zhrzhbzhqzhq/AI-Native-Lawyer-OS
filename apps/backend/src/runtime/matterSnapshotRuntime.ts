import type { PrismaClient } from '@lawdesk/database';
import ContextBuilder from './contextBuilder';
import analyzeRuntimeState from './runtimeAnalyzer'
import decideFromRuntimeState from './runtimeDecisionEngine'
import planFromRuntimeDecision from './runtimePlannerEngine'
import assignFromRuntimePlan from './runtimeChiefEngine'
import worksFromRuntimePlan from './runtimeLegalEngine'
import actionsFromRuntimeWorks from './runtimeExecutorEngine'
import scheduleRuntimeActions from './runtimeScheduler'
import MatterStateEngine from './matterStateEngine';
import { NextStepEngine } from './nextStepEngine'

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
      open: (ctx.graph?.tasks || []).filter((t: any) => !['completed', 'done', 'closed'].includes(String(t?.status || '').toLowerCase())).length,
      completed: (ctx.graph?.tasks || []).filter((t: any) => ['completed', 'done', 'closed'].includes(String(t?.status || '').toLowerCase())).length,
      items: ctx.graph?.tasks || [],
    };

    const documents = {
      total: (ctx.graph?.documents || []).length,
      draft: (ctx.graph?.documents || []).filter((d: any) => !['final', 'completed', 'archived'].includes(String(d?.status || '').toLowerCase())).length,
      final: (ctx.graph?.documents || []).filter((d: any) => ['final', 'completed'].includes(String(d?.status || '').toLowerCase())).length,
      items: ctx.graph?.documents || [],
    };

    const evidence = { total: (ctx.graph?.evidence || []).length, items: ctx.graph?.evidence || [] };
    const research = { total: (ctx.graph?.research || []).length, items: ctx.graph?.research || [] };

    // compute workflow using state engine
    const snapshotLike = {
      matter,
      tasks,
      documents,
      evidence,
      research,
    } as any

    const workflow = MatterStateEngine.evaluate(snapshotLike as any)

    const timeline = { total: (ctx.graph?.timeline || []).length, recent: (ctx.recentTimeline || ctx.graph?.timeline || []).slice(0, 10) };

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
        ; (ai as any).intelligence = intelligenceOut
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
        archived: (ctx.graph?.documents || []).filter((d: any) => String(d?.status || '').toLowerCase() === 'archived').length,
      },
      evidence: {
        weak: Array.isArray(evidence.items) ? evidence.items.filter((e: any) => (String(e.relevance || '').trim() === '' || String(e.description || '').trim() === '')).length : 0,
      },
      activity: {
        recent: typeof timeline.total === 'number' ? timeline.total : (Array.isArray(timeline.recent) ? timeline.recent.length : 0),
      },
      generated_at: new Date().toISOString(),
    }

    let runtime_state = analyzeRuntimeState(snapshot_facts)
    let runtime_decision = decideFromRuntimeState(runtime_state)
    let runtime_plan = planFromRuntimeDecision(runtime_decision)
    let runtime_assignments = assignFromRuntimePlan(runtime_plan)
    let runtime_works = worksFromRuntimePlan(runtime_plan)
    let runtime_actions = actionsFromRuntimeWorks(runtime_works)
    let today_queue = scheduleRuntimeActions(runtime_actions)

    // Overlay persisted execution state: detect evidence-related DONE items and append EVIDENCE_REVIEW_DONE
    try {
      const ExecutionService = (await import('../execution/executionService')).default
      const execService = new ExecutionService((this.contextBuilder as any).prisma || (await import('@lawdesk/database')).createPrismaClient())
      const persisted = await execService.loadQueueState(matter?.matter_id)
      const persistedList = Array.isArray(persisted) ? persisted : []

      // identify evidence-related queue ids from today's generated queue
      const evidenceQueueIds = new Set<string>()
      if (Array.isArray(today_queue)) {
        for (const q of today_queue) {
          try {
            const fields = [q.queue_id, q.action_id, q.work_id, q.slot, q.status]
            const joined = fields.filter(Boolean).map((f: any) => String(f).toLowerCase()).join(' ')
            if (joined.includes('evidence')) evidenceQueueIds.add(String(q.queue_id))
          } catch (e) { }
        }
      }

      // If none found from today_queue, also consider persisted rows that include 'evidence' in their fields
      if (evidenceQueueIds.size === 0) {
        for (const p of persistedList) {
          try {
            const fields = [p.queue_id, p.action_id, p.work_id, p.slot, p.execution_status]
            const joined = fields.filter(Boolean).map((f: any) => String(f).toLowerCase()).join(' ')
            if (joined.includes('evidence')) evidenceQueueIds.add(String(p.queue_id))
          } catch (e) { }
        }
      }

      // now check persisted rows whose queue_id is in evidenceQueueIds and have execution_status = DONE
      let evidenceDone = false
      if (evidenceQueueIds.size > 0) {
        for (const p of persistedList) {
          try {
            const qid = String(p.queue_id || '')
            const status = String(p.execution_status || '').toUpperCase()
            if (evidenceQueueIds.has(qid) && status === 'DONE') {
              evidenceDone = true
              break
            }
          } catch (e) { }
        }
      }

      if (evidenceDone) {
        runtime_state = runtime_state.concat([{ code: 'EVIDENCE_REVIEW_DONE', value: true } as any])
        // recompute decision/plan/work/actions so final snapshot reflects the updated state
        try {
          runtime_decision = decideFromRuntimeState(runtime_state)
          runtime_plan = planFromRuntimeDecision(runtime_decision)
          runtime_assignments = assignFromRuntimePlan(runtime_plan)
          runtime_works = worksFromRuntimePlan(runtime_plan)
          runtime_actions = actionsFromRuntimeWorks(runtime_works)
          today_queue = scheduleRuntimeActions(runtime_actions)
        } catch (e) {
          // ignore recompute errors
        }
      }
    } catch (e) {
      // ignore overlay errors
    }

    // runtime_decision/plan/assignments/works/actions/today_queue already
    // computed above and possibly recomputed if evidence review done was detected.

    // compute runtime_next_step via NextStepEngine
    let runtime_next_step = null
    try {
      runtime_next_step = NextStepEngine.generate({ runtime_state, runtime_decision, runtime_plan, today_queue, snapshot_facts })
    } catch (e) {
      runtime_next_step = null
    }

    return {
      matter,
      workflow,
      tasks,
      runtime_state,
      runtime_decision,
      runtime_plan,
      runtime_next_step,
      runtime_assignments,
      runtime_works,
      runtime_actions,
      today_queue,
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
