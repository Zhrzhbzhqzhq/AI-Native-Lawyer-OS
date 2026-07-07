import { FastifyInstance } from 'fastify';
import { createPrismaClient } from '@lawdesk/database';
import MatterService from '../services/matterService';
import TimelineService from '../services/timelineService';

export async function matterRoutes(app: FastifyInstance) {
  const prisma = createPrismaClient();
  const service = new MatterService(prisma);
  const timelineService = new TimelineService(prisma);
  const evidenceService = new (await import('../services/evidenceService')).default(prisma);
  const factService = new (await import('../services/factService')).default(prisma);
  const materialService = new (await import('../services/materialService')).default(prisma);
  const researchService = new (await import('../services/researchService')).default(prisma);
  const documentService = new (await import('../services/documentService')).default(prisma);
  const taskService = new (await import('../services/taskService')).default(prisma);
  const conversationService = new (await import('../services/conversationService')).default(prisma);
  const matterContextService = new (await import('../services/matterContextService')).default(prisma);
  const promptBuilderService = new (await import('../services/promptBuilderService')).default(prisma);
  const aiSuggestionService = new (await import('../services/aiSuggestionService')).default(prisma);
  const objectGraphBuilder = new (await import('../runtime/objectGraphBuilder')).default(prisma);
  const contextBuilder = new (await import('../runtime/contextBuilder')).default(prisma);
  const promptRuntime = new (await import('../runtime/promptRuntime')).default(prisma);
  // nextStepEngine will be dynamically imported where needed to maintain compatibility with different engine shapes
  const plannerRuntime = new (await import('../runtime/plannerRuntime')).default(prisma);
  const actionProposalRuntime = new (await import('../runtime/actionProposalRuntime')).default(prisma);
  // workflow service
  const workflowService = new (await import('../services/workflowService')).default()

  app.get('/matters', async () => {
    return service.list();
  });

  app.get('/matters/:id', async (request, reply) => {
    const { id } = request.params as any;
    const matter = await service.get(id);
    if (!matter) return reply.code(404).send({ error: 'Not found' });
    return matter;
  });

  app.get('/matters/:id/timeline', async (request, reply) => {
    const { id } = request.params as any
    const list = await timelineService.listByMatter(id);
    return reply.code(200).send(list)
  });

  app.get('/matters/:id/research', async (request, reply) => {
    const { id } = request.params as any;
    const list = await researchService.listByMatter(id);
    return list;
  });

  app.get('/matters/:id/documents', async (request, reply) => {
    const { id } = request.params as any;
    const list = await documentService.listByMatter(id);
    return list;
  });

  app.get('/matters/:id/tasks', async (request, reply) => {
    const { id } = request.params as any;
    const list = await taskService.listByMatter(id);
    return list;
  });

  app.get('/matters/:id/conversation', async (request, reply) => {
    const { id } = request.params as any;
    const list = await conversationService.listByMatter(id);
    return list;
  });

  app.get('/matters/:id/context', async (request, reply) => {
    const { id } = request.params as any;
    try {
      const ctx = await matterContextService.buildContext(id);
      return ctx;
    } catch (err: any) {
      return reply.code(404).send({ error: 'Not found', detail: err?.message || String(err) });
    }
  });

  app.get('/matters/:id/prompt', async (request, reply) => {
    const { id } = request.params as any;
    try {
      const pack = await promptBuilderService.buildPromptPack(id);
      return pack;
    } catch (err: any) {
      return reply.code(404).send({ error: 'Not found', detail: err?.message || String(err) });
    }
  });

  app.post('/matters/:id/ai/suggest', async (request, reply) => {
    const { id } = request.params as any;
    try {
      const result = await aiSuggestionService.suggestForMatter(id);
      return result;
    } catch (err: any) {
      return reply.code(500).send({ error: 'suggestion failed', detail: err?.message || String(err) });
    }
  });

  app.get('/matters/:id/graph', async (request, reply) => {
    const { id } = request.params as any;
    try {
      const graph = await objectGraphBuilder.build(id);
      return graph;
    } catch (err: any) {
      if (err?.message === 'Matter not found') {
        return reply.code(404).send({ error: 'Not found', detail: err.message });
      }
      return reply.code(500).send({ error: 'graph failed', detail: err?.message || String(err) });
    }
  });

  app.get('/matters/:matter_id/context-runtime', async (request, reply) => {
    const { matter_id } = request.params as any;
    try {
      const context = await contextBuilder.build(matter_id);
      return context;
    } catch (err: any) {
      if (err?.message === 'Matter not found') {
        return reply.code(404).send({ error: 'Not found', detail: err.message });
      }
      return reply.code(500).send({ error: 'context-runtime failed', detail: err?.message || String(err) });
    }
  });

  app.get('/matters/:matter_id/runtime', async (request, reply) => {
    const { matter_id } = request.params as any;
    try {
      const runtime = new (await import('../runtime/matterSnapshotRuntime')).default(prisma);
      const snap = await runtime.build(matter_id);

      // Overlay persisted execution status onto today_queue at the route layer
      try {
        const ExecutionService = (await import('../execution/executionService')).default
        const execService = new ExecutionService(prisma)
        const persisted = await execService.loadQueueState(matter_id)
        const map = new Map((Array.isArray(persisted) ? persisted : []).map((p: any) => [p.queue_id, p]))

        if (Array.isArray(snap.today_queue)) {
          snap.today_queue = snap.today_queue.map((q: any) => {
            const p = map.get(q.queue_id)
            return { ...q, execution_status: p ? p.execution_status : 'PENDING' }
          })
        }
      } catch (e) {
        // overlay failure should not block returning the snapshot
      }

      // attach in-memory runtime events/logs so frontend can display AI 工作日志
      try {
        const RuntimeEventEngine = (await import('../runtime/runtimeEventEngine')).default
        const engine = new RuntimeEventEngine()
        const evs = engine.list(matter_id) || []
        const mapped = (Array.isArray(evs) ? evs : []).map((e: any) => ({
          time: e.created_at || e.payload?.time || new Date().toISOString(),
          action: e.payload?.action || e.type || (e.payload && e.payload.action) || '',
          result: e.payload?.result || e.payload?.result || '',
          status: e.payload?.status || '',
          queue_id: e.payload?.queue_id || e.payload?.queueId || null,
          matter_id: e.matter_id || matter_id,
        }))
          // provide both fields so frontend can use runtime.logs or runtime.events
          ; (snap as any).logs = mapped
          ; (snap as any).events = mapped
      } catch (e) {
        // ignore
      }

      return reply.code(200).send(snap);
    } catch (err: any) {
      return reply.code(500).send({ error: 'runtime snapshot failed', detail: err?.message || String(err) });
    }
  });

  app.get('/matters/:matter_id/director', async (request, reply) => {
    const { matter_id } = request.params as any;
    try {
      const RuntimeDirector = (await import('../runtime/runtimeDirector')).default
      const director = new RuntimeDirector(createPrismaClient())
      const res = await director.decide(matter_id)
      return reply.code(200).send(res)
    } catch (err: any) {
      return reply.code(500).send({ error: 'director failed', detail: err?.message || String(err) })
    }
  })

  app.get('/matters/:matter_id/events', async (request, reply) => {
    const { matter_id } = request.params as any
    try {
      const RuntimeEventEngine = (await import('../runtime/runtimeEventEngine')).default
      const engine = new RuntimeEventEngine()
      const events = engine.list(matter_id)
      return reply.code(200).send({ events })
    } catch (err: any) {
      return reply.code(500).send({ error: 'events failed', detail: err?.message || String(err) })
    }
  })

  app.get('/matters/:matter_id/prompt-runtime', async (request, reply) => {
    const { matter_id } = request.params as any;
    try {
      const pack = await promptRuntime.build(matter_id);
      return pack;
    } catch (err: any) {
      if (err?.message === 'Matter not found') {
        return reply.code(404).send({ error: 'Not found', detail: err.message });
      }
      return reply.code(500).send({ error: 'prompt-runtime failed', detail: err?.message || String(err) });
    }
  });

  app.post('/matters/:matter_id/plan-runtime', async (request, reply) => {
    const { matter_id } = request.params as any;
    try {
      const plan = await plannerRuntime.plan(matter_id);
      return plan;
    } catch (err: any) {
      if (err?.message === 'Matter not found') {
        return reply.code(404).send({ error: 'Not found', detail: err.message });
      }
      return reply.code(500).send({ error: 'plan-runtime failed', detail: err?.message || String(err) });
    }
  });

  app.post('/matters/:matter_id/action-proposals', async (request, reply) => {
    const { matter_id } = request.params as any;
    try {
      const res = await actionProposalRuntime.generate(matter_id);
      return reply.code(201).send(res.proposals);
    } catch (err: any) {
      if (err?.message === 'Matter not found') return reply.code(404).send({ error: 'Not found', detail: err.message });
      return reply.code(500).send({ error: 'action-proposals failed', detail: err?.message || String(err) });
    }
  });

  app.get('/matters/:matter_id/action-proposals', async (request, reply) => {
    const { matter_id } = request.params as any;
    try {
      const list = await actionProposalRuntime.list(matter_id);
      return list;
    } catch (err: any) {
      return reply.code(500).send({ error: 'failed', detail: err?.message || String(err) });
    }
  });

  app.patch('/matters/:matter_id/action-proposals/:proposal_id', async (request, reply) => {
    const { proposal_id } = request.params as any;
    const payload = request.body as any;
    if (!payload || !['approved', 'rejected'].includes(payload.status)) return reply.code(400).send({ error: 'invalid status' });
    try {
      const updated = await actionProposalRuntime.updateStatus(proposal_id, payload.status);
      return updated;
    } catch (err: any) {
      return reply.code(404).send({ error: 'not found', detail: err?.message || String(err) });
    }
  });

  app.post('/matters/:matter_id/action-proposals/:proposal_id/execute', async (request, reply) => {
    const { proposal_id } = request.params as any;
    try {
      const executor = new (await import('../runtime/actionExecutorRuntime')).default(createPrismaClient());
      const res = await executor.execute(proposal_id);
      return res;
    } catch (err: any) {
      if (String(err) === 'Error: not found') return reply.code(404).send({ error: 'not found' });
      if (String(err) === 'Error: invalid status') return reply.code(400).send({ error: 'invalid status' });
      if (String(err) === 'Error: unsupported action') return reply.code(400).send({ error: 'unsupported action' });
      return reply.code(500).send({ error: 'execute failed', detail: err?.message || String(err) });
    }
  });

  // Workflow definition endpoints (simple in-memory)
  app.get('/workflows', async (request, reply) => {
    try {
      const list = await workflowService.list()
      return list
    } catch (err: any) {
      return reply.code(500).send({ error: 'failed', detail: err?.message || String(err) })
    }
  })

  app.get('/workflows/:workflow_id', async (request, reply) => {
    const { workflow_id } = request.params as any
    try {
      const wf = await workflowService.get(workflow_id)
      if (!wf) return reply.code(404).send({ error: 'not_found' })
      return wf
    } catch (err: any) {
      return reply.code(500).send({ error: 'failed', detail: err?.message || String(err) })
    }
  })

  app.post('/workflows', async (request, reply) => {
    const payload = request.body as any
    try {
      const created = await workflowService.create(payload)
      return reply.code(201).send(created)
    } catch (err: any) {
      return reply.code(400).send({ error: 'invalid', detail: err?.message || String(err) })
    }
  })

  // Matter workflow runtime endpoints
  const workflowInstanceService = new (await import('../services/workflowInstanceService')).default()

  app.get('/matters/:matter_id/workflow', async (request, reply) => {
    const { matter_id } = request.params as any
    try {
      const inst = await workflowInstanceService.getForMatter(matter_id)
      if (!inst) return reply.code(404).send({ error: 'not_started' })
      return inst
    } catch (err: any) {
      return reply.code(500).send({ error: 'failed', detail: err?.message || String(err) })
    }
  })

  app.post('/matters/:matter_id/workflow/start', async (request, reply) => {
    const { matter_id } = request.params as any
    try {
      const inst = await workflowInstanceService.start(matter_id)
      return reply.code(201).send(inst)
    } catch (err: any) {
      return reply.code(500).send({ error: 'failed', detail: err?.message || String(err) })
    }
  })

  app.post('/matters/:matter_id/workflow/advance', async (request, reply) => {
    const { matter_id } = request.params as any
    try {
      const inst = await workflowInstanceService.advance(matter_id)
      return inst
    } catch (err: any) {
      if (String(err) === 'Error: not_started') return reply.code(400).send({ error: 'not_started' })
      return reply.code(500).send({ error: 'failed', detail: err?.message || String(err) })
    }
  })

  // AI Planner
  const plannerService = new (await import('../services/plannerService')).default(prisma)

  app.post('/matters/:matter_id/plan', async (request, reply) => {
    const { matter_id } = request.params as any
    try {
      const plan = await plannerService.planForMatter(matter_id)
      return plan
    } catch (err: any) {
      return reply.code(500).send({ error: 'failed', detail: err?.message || String(err) })
    }
  })

  app.post('/matters/:id/conversation', async (request, reply) => {
    const { id } = request.params as any;
    const payload = request.body as any;
    if (!payload.message_id || !payload.role || !payload.content) return reply.code(400).send({ error: 'message_id, role and content required' });
    if (!['user', 'assistant', 'system'].includes(payload.role)) return reply.code(400).send({ error: 'invalid role' });
    try {
      const created = await conversationService.createForMatter(id, payload);
      return reply.code(201).send(created);
    } catch (err: any) {
      return reply.code(500).send({ error: 'create failed', detail: err?.message || String(err) });
    }
  });

  app.delete('/matters/:id/conversation/:message_id', async (request, reply) => {
    const { message_id } = request.params as any;
    try {
      await conversationService.deleteByMessageId(message_id);
      return reply.code(204).send();
    } catch (err: any) {
      return reply.code(404).send({ error: 'Not found or delete failed', detail: err?.message || String(err) });
    }
  });

  app.post('/matters/:id/tasks', async (request, reply) => {
    const { id } = request.params as any;
    const payload = request.body as any;
    if (!payload.task_id || !payload.title) return reply.code(400).send({ error: 'task_id and title required' });
    try {
      const created = await taskService.createForMatter(id, payload);
      return reply.code(201).send(created);
    } catch (err: any) {
      return reply.code(500).send({ error: 'create failed', detail: err?.message || String(err) });
    }
  });

  app.patch('/matters/:id/tasks/:task_id', async (request, reply) => {
    const { task_id } = request.params as any;
    const patch = request.body as any;
    try {
      const updated = await taskService.updateByTaskId(task_id, patch);
      return updated;
    } catch (err: any) {
      return reply.code(404).send({ error: 'Not found or update failed', detail: err?.message || String(err) });
    }
  });

  app.delete('/matters/:id/tasks/:task_id', async (request, reply) => {
    const { task_id } = request.params as any;
    try {
      await taskService.deleteByTaskId(task_id);
      return reply.code(204).send();
    } catch (err: any) {
      return reply.code(404).send({ error: 'Not found or delete failed', detail: err?.message || String(err) });
    }
  });

  app.post('/matters/:id/research', async (request, reply) => {
    const { id } = request.params as any;
    const payload = request.body as any;
    // require research_id and title
    if (!payload.research_id || !payload.title) return reply.code(400).send({ error: 'research_id and title required' });
    try {
      const created = await researchService.createForMatter(id, payload);
      return reply.code(201).send(created);
    } catch (err: any) {
      return reply.code(500).send({ error: 'create failed', detail: err?.message || String(err) });
    }
  });

  // Matter Workspace - read-only dashboard data for the matter workspace home (Alpha)
  app.get('/matters/:matter_id/workspace', async (request, reply) => {
    const { matter_id } = request.params as any;
    try {
      const m = await service.get(matter_id);
      if (!m) return reply.code(404).send({ error: 'Not found' });

      // list resources (read-only) and compute simple summaries
      // Use server-side limited queries for recent_* to avoid fetching large result sets.
      const materialsCount = await prisma.material.count({ where: { matter_id } }).catch(() => 0)
      const evidenceCount = await prisma.evidence.count({ where: { matter_id } }).catch(() => 0)
      const documentsCount = await prisma.document.count({ where: { matter_id } }).catch(() => 0)

      const summary = {
        materials: materialsCount,
        evidence: evidenceCount,
        documents: documentsCount,
        // placeholder: do not invoke AI/runtime in this read-only alpha endpoint
        pending_ai_suggestions: 0,
      }

      const object_navigation = [
        {
          key: 'materials',
          label: 'Materials',
          count: summary.materials,
          href: `/matters/${matter_id}/materials`,
          description: '案件资料',
        },
        {
          key: 'evidence',
          label: 'Evidence',
          count: summary.evidence,
          href: `/matters/${matter_id}/evidence`,
          description: '正式证据',
        },
        {
          key: 'documents',
          label: 'Documents',
          count: summary.documents,
          href: `/matters/${matter_id}/documents`,
          description: '案件文书',
        },
      ]

      const recent_materials = await prisma.material.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' }, take: 5 }).catch(() => [])
      const recent_evidence = await prisma.evidence.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' }, take: 5 }).catch(() => [])
      const recent_documents = await prisma.document.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' }, take: 5 }).catch(() => [])

      // Build recent_activity from materials, evidence, documents (read-only)
      const mapMaterialActivity = (m: any) => ({
        type: 'material_uploaded',
        title: 'Uploaded material',
        description: m.title || m.storage_uri || m.material_type || '',
        time: m.created_at ? (m.created_at instanceof Date ? m.created_at.toISOString() : String(m.created_at)) : null,
      })

      const mapEvidenceActivity = (e: any) => ({
        type: 'evidence_created',
        title: 'Evidence confirmed',
        description: e.title || e.description || e.evidence_type || '',
        time: e.created_at ? (e.created_at instanceof Date ? e.created_at.toISOString() : String(e.created_at)) : null,
      })

      const mapDocumentActivity = (d: any) => ({
        type: 'document_updated',
        title: d.title || 'Document updated',
        description: d.version ? `v${d.version}` : (d.document_type || ''),
        time: d.created_at ? (d.created_at instanceof Date ? d.created_at.toISOString() : String(d.created_at)) : null,
      })

      const recent_activity = [
        ...recent_materials.map(mapMaterialActivity),
        ...recent_evidence.map(mapEvidenceActivity),
        ...recent_documents.map(mapDocumentActivity),
      ]

      // sort by time desc and filter out null times
      recent_activity.sort((a: any, b: any) => {
        const ta = a.time ? Date.parse(a.time) : 0
        const tb = b.time ? Date.parse(b.time) : 0
        return tb - ta
      })

      // AI Next Steps - rule based, read-only
      try {
        // compute additional signals for engine
        const weakEvidenceCount = await prisma.evidence.count({ where: { matter_id, OR: [{ relevance: '' }, { description: '' }] } })
        const draftDocumentCount = await prisma.document.count({ where: { matter_id, status: 'draft' } })
        const archivedDocumentCount = await prisma.document.count({ where: { matter_id, status: 'archived' } })

        // Attempt to use nextStepEngine in a backward-compatible way
        let ai_next_steps: any[] = []
        try {
          const mod = (await import('../runtime/nextStepEngine')) as (typeof import('../runtime/nextStepEngine') & { default?: any })
          // prefer named NextStepEngine with generate()
          if (mod && typeof mod.NextStepEngine === 'function' && typeof mod.NextStepEngine.generate === 'function') {
            const out = mod.NextStepEngine.generate({ runtime_state: [], runtime_decision: {}, runtime_plan: {}, today_queue: [], snapshot_facts: {} })
            ai_next_steps = out ? [out] : []
          } else if (mod && typeof mod.default === 'function') {
            // older engine: instantiate and call evaluate()
            const Engine = mod.default
            const engine = new Engine()
            if (typeof engine.evaluate === 'function') {
              ai_next_steps = engine.evaluate({
                materialsCount: summary.materials,
                evidenceCount: summary.evidence,
                documentsCount: summary.documents,
                recentActivityCount: recent_activity.length,
                weakEvidenceCount,
                draftDocumentCount,
                archivedDocumentCount,
              })
              if (!Array.isArray(ai_next_steps)) ai_next_steps = Array.isArray(ai_next_steps) ? ai_next_steps : []
            }
          }
        } catch (e) {
          ai_next_steps = []
        }

        return reply.code(200).send({
          matter: { matter_id: m.matter_id, title: m.title, status: m.status },
          summary,
          object_navigation,
          recent_materials,
          recent_evidence,
          recent_documents,
          recent_activity,
          ai_next_steps: Array.isArray(ai_next_steps) ? ai_next_steps : [],
        })
      } catch (e) {
        // fallback: still return workspace ensuring ai_next_steps exists as an array
        return reply.code(200).send({
          matter: { matter_id: m.matter_id, title: m.title, status: m.status },
          summary,
          object_navigation,
          recent_materials,
          recent_evidence,
          recent_documents,
          recent_activity,
          ai_next_steps: [],
        })
      }
    } catch (err: any) {
      return reply.code(500).send({ error: 'workspace failed', detail: err?.message || String(err) })
    }
  })

  app.delete('/matters/:id/research/:research_id', async (request, reply) => {
    const { research_id } = request.params as any;
    try {
      await researchService.deleteByResearchId(research_id);
      return reply.code(204).send();
    } catch (err: any) {
      return reply.code(404).send({ error: 'Not found or delete failed', detail: err?.message || String(err) });
    }
  });

  app.post('/matters/:id/documents', async (request, reply) => {
    const { id } = request.params as any;
    const payload = request.body as any;
    if (!payload.document_id || !payload.title) return reply.code(400).send({ error: 'document_id and title required' });
    try {
      const created = await documentService.createForMatter(id, payload);
      return reply.code(201).send(created);
    } catch (err: any) {
      return reply.code(500).send({ error: 'create failed', detail: err?.message || String(err) });
    }
  });

  app.delete('/matters/:id/documents/:document_id', async (request, reply) => {
    const { document_id } = request.params as any;
    try {
      await documentService.deleteByDocumentId(document_id);
      return reply.code(204).send();
    } catch (err: any) {
      return reply.code(404).send({ error: 'Not found or delete failed', detail: err?.message || String(err) });
    }
  });

  app.post('/matters/:id/materials', async (request, reply) => {
    const { id } = request.params as any;
    const payload = request.body as any;
    // require material_id and title
    if (!payload.material_id || !payload.title) return reply.code(400).send({ error: 'material_id and title required' });
    try {
      const created = await materialService.createForMatter(id, payload);
      return reply.code(201).send(created);
    } catch (err: any) {
      return reply.code(500).send({ error: 'create failed', detail: err?.message || String(err) });
    }
  });

  // Restore legacy GET materials list for compatibility with tests/frontend
  app.get('/matters/:id/materials', async (request, reply) => {
    const { id } = request.params as any;
    try {
      const list = await materialService.listByMatter(id);
      return reply.code(200).send(list);
    } catch (err: any) {
      return reply.code(500).send({ error: 'failed', detail: err?.message || String(err) });
    }
  });

  app.get('/matters/:matter_id/next-step', async (request, reply) => {
    const { matter_id } = request.params as any;
    try {
      // build counts from services (read-only)
      const materials = await materialService.listByMatter(matter_id).catch(() => [])
      const evidence = await evidenceService.listByMatter(matter_id).catch(() => [])
      const documents = await documentService.listByMatter(matter_id).catch(() => [])

      const summary = {
        materials: Array.isArray(materials) ? materials.length : 0,
        evidence: Array.isArray(evidence) ? evidence.length : 0,
        documents: Array.isArray(documents) ? documents.length : 0,
      }

      const recent_materials = Array.isArray(materials) ? materials.slice(0, 5) : []
      const recent_evidence = Array.isArray(evidence) ? evidence.slice(0, 5) : []
      const recent_documents = Array.isArray(documents) ? documents.slice(0, 5) : []

      const recent_activity = [
        ...recent_materials.map((m: any) => ({ type: 'material_uploaded', time: m.created_at ? (m.created_at instanceof Date ? m.created_at.toISOString() : String(m.created_at)) : null })),
        ...recent_evidence.map((e: any) => ({ type: 'evidence_created', time: e.created_at ? (e.created_at instanceof Date ? e.created_at.toISOString() : String(e.created_at)) : null })),
        ...recent_documents.map((d: any) => ({ type: 'document_updated', time: d.created_at ? (d.created_at instanceof Date ? d.created_at.toISOString() : String(d.created_at)) : null })),
      ]

      const weakEvidenceCount = await prisma.evidence.count({ where: { matter_id, OR: [{ relevance: '' }, { description: '' }] } })
      const draftDocumentCount = await prisma.document.count({ where: { matter_id, status: 'draft' } })
      const archivedDocumentCount = await prisma.document.count({ where: { matter_id, status: 'archived' } })

      // Use nextStepEngine in a backward-compatible way
      try {
        const mod = (await import('../runtime/nextStepEngine')) as (typeof import('../runtime/nextStepEngine') & { default?: any })
        let steps: any[] = []
        if (mod && typeof mod.NextStepEngine === 'function' && typeof mod.NextStepEngine.generate === 'function') {
          const out = mod.NextStepEngine.generate({ runtime_state: [], runtime_decision: {}, runtime_plan: {}, today_queue: [], snapshot_facts: {} })
          steps = out ? [out] : []
        } else if (mod && typeof mod.default === 'function') {
          const Engine = mod.default
          const engine = new Engine()
          const evaluated = typeof engine.evaluate === 'function' ? engine.evaluate({
            materialsCount: summary.materials,
            evidenceCount: summary.evidence,
            documentsCount: summary.documents,
            recentActivityCount: recent_activity.length,
            weakEvidenceCount,
            draftDocumentCount,
            archivedDocumentCount,
          }) : []
          steps = Array.isArray(evaluated) ? evaluated : []
        }

        // Compatibility rule: if materials > 0 and evidence == 0, ensure generate_evidence_draft is present first
        try {
          const needsGenerate = (Number(summary.materials || 0) > 0) && (Number(summary.evidence || 0) === 0)
          if (needsGenerate) {
            const exists = steps.some((s: any) => s && (s.action === 'generate_evidence_draft' || String(s.action || '').toLowerCase().includes('generate_evidence')))
            if (!exists) {
              const gen = {
                action: 'generate_evidence_draft',
                title: '生成证据草稿',
                target_workspace: 'evidence',
                reason: '案件已有材料，但尚未形成正式证据，建议先生成证据草稿。',
                priority: 1,
              }
              steps.unshift(gen)
            }
          }
        } catch (e) {
          // ignore
        }

        // cap to 3 steps
        steps = Array.isArray(steps) ? steps.slice(0, 3) : []

        return reply.code(200).send({ matter_id, steps })
      } catch (e) {
        return reply.code(200).send({ matter_id, steps: [] })
      }
    } catch (err: any) {
      return reply.code(500).send({ error: 'next-step failed', detail: err?.message || String(err) })
    }
  })

  // Evidence Workspace - read-only dashboard
  app.get('/matters/:matter_id/evidence/workspace', async (request, reply) => {
    const { matter_id } = request.params as any
    try {
      const m = await service.get(matter_id)
      if (!m) return reply.code(404).send({ error: 'Not found' })

      // counts
      const total = await prisma.evidence.count({ where: { matter_id } }).catch(() => 0)
      const accepted = await prisma.evidence.count({ where: { matter_id, status: 'accepted' } }).catch(() => 0)
      const pending = await prisma.evidence.count({ where: { matter_id, status: { in: ['pending', 'draft', 'active'] } } }).catch(() => 0)
      // weak = relevance empty OR description empty
      const allEvidence = await prisma.evidence.findMany({ where: { matter_id }, select: { evidence_id: true, relevance: true, description: true, updated_at: true, title: true, evidence_type: true, status: true } }).catch(() => [])
      const weak = Array.isArray(allEvidence) ? allEvidence.filter((e: any) => !e.relevance || !e.description).length : 0

      const summary = {
        total: Number(total),
        accepted: Number(accepted),
        pending: Number(pending),
        weak: Number(weak),
        missing: 0,
      }

      const evidence_list = await prisma.evidence.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' }, take: 20, select: { evidence_id: true, title: true, evidence_type: true, status: true, relevance: true, description: true, material_id: true, updated_at: true } }).catch(() => [])
      // ensure `source` field exists for frontend compatibility
      const evidence_list_mapped = (Array.isArray(evidence_list) ? evidence_list : []).map((e: any) => ({ ...e, source: (e as any).source ?? 'unknown' }))

      // selected_evidence: if list non-empty, pick first and enrich with related material, placeholders
      let selected_evidence: any = null
      if (evidence_list_mapped.length > 0) {
        const first = evidence_list_mapped[0]
        // fetch related material title if available
        let related_material = null
        if (first.material_id) {
          try {
            const mat = await prisma.material.findUnique({ where: { material_id: first.material_id }, select: { material_id: true, title: true } }).catch(() => null)
            if (mat) related_material = { material_id: mat.material_id, title: mat.title }
          } catch (e) {
            related_material = null
          }
        }

        selected_evidence = {
          evidence_id: first.evidence_id,
          title: first.title,
          evidence_type: first.evidence_type,
          status: first.status,
          relevance: first.relevance,
          description: first.description ?? '',
          source: first.source ?? 'unknown',
          updated_at: first.updated_at ? (first.updated_at instanceof Date ? first.updated_at.toISOString() : String(first.updated_at)) : null,
          related_material,
          related_documents: [],
          related_timeline: [],
          lawyer_notes: { status: 'read_only', message: 'Lawyer notes coming soon' },
          ai_summary: (function computeAiSummary(ev: any, rm: any) {
            // Rule-based analysis (read-only, deterministic)
            let score = 50
            const strengths: string[] = []
            const risks: string[] = []
            const recommendations: string[] = []

            const desc = (ev.description || '').trim()
            const rel = (ev.relevance || '').trim()

            if (desc.length > 0) {
              score += 20
              strengths.push('Evidence description provided.')
            } else {
              risks.push('Description missing.')
              recommendations.push('Add a description to clarify the evidence.')
            }

            if (rm) {
              score += 20
              strengths.push('Related material linked.')
            } else {
              risks.push('No related material.')
              recommendations.push('Link the related material if available.')
            }

            if (rel.length > 0) {
              score += 10
              if (rel.toLowerCase() === 'high') strengths.push('High relevance.')
              else strengths.push('Relevance provided.')
            } else {
              risks.push('Relevance not assessed.')
              recommendations.push('Set the relevance level for this evidence.')
            }

            if (score > 100) score = 100

            let completeness = 'low'
            if (score >= 80) completeness = 'high'
            else if (score >= 60) completeness = 'medium'

            return {
              status: 'rule_based',
              score: Number(score),
              completeness,
              strengths,
              risks,
              recommendations,
            }
          })(first, related_material),
        }
      }

      // build navigation (read-only counts)
      const types = ['electronic', 'physical', 'recording', 'photo', 'video', 'contract', 'transfer', 'chat', 'witness', 'other']
      const by_type = await Promise.all(types.map(async (t) => {
        const c = await prisma.evidence.count({ where: { matter_id, evidence_type: t } }).catch(() => 0)
        return { key: t, label: t, count: Number(c), description: '' }
      }))

      const statuses = ['active', 'pending', 'accepted', 'weak', 'rejected']
      const by_status = await Promise.all(statuses.map(async (s) => {
        const c = await prisma.evidence.count({ where: { matter_id, status: s } }).catch(() => 0)
        return { key: s, label: s, count: Number(c), description: '' }
      }))

      // strength rules
      const strong = await prisma.evidence.count({ where: { matter_id, status: 'accepted' } }).catch(() => 0)
      const medium = await prisma.evidence.count({ where: { matter_id, status: { in: ['active', 'pending', 'draft'] } } }).catch(() => 0)
      const weakCount = await prisma.evidence.count({ where: { matter_id, OR: [{ relevance: '' }, { description: '' }] } }).catch(() => 0)
      const totalCount = Number(total)
      const unknown = Math.max(0, totalCount - (Number(strong) + Number(medium) + Number(weakCount)))
      const by_strength = [
        { key: 'strong', label: 'strong', count: Number(strong), description: '' },
        { key: 'medium', label: 'medium', count: Number(medium), description: '' },
        { key: 'weak', label: 'weak', count: Number(weakCount), description: '' },
        { key: 'unknown', label: 'unknown', count: Number(unknown), description: '' },
      ]

      // compute missing suggestions and next steps outside the response object so we can pass computed missing
      const missing_suggestions = (function computeMissing(allEv: any[], totalCount: number) {
        const suggestions: any[] = []
        const typesPresent = new Set((allEv || []).map((x: any) => (x.evidence_type || '').toLowerCase()))

        if (!totalCount || totalCount === 0) {
          suggestions.push({
            id: 'missing-basic-evidence',
            title: '缺少基础证据材料',
            description: '当前未发现任何证据条目，请收集基础证据材料（照片、合同、收据等）。',
            priority: 'HIGH',
            reason: 'No evidence exists for this matter.',
            suggested_action: 'collect_basic_evidence'
          })
        }

        // missing transfer/bank/payment
        const hasTransfer = Array.from(typesPresent).some((t: any) => /transfer|bank|payment/.test(t))
        if (!hasTransfer) {
          suggestions.push({
            id: 'missing-transfer-record',
            title: '缺少转账记录',
            description: '当前证据中未发现转账、付款或银行流水类证据。',
            priority: 'HIGH',
            reason: 'No evidence_type matches transfer / bank / payment.',
            suggested_action: 'ask_client_to_provide_transfer_record'
          })
        }

        // missing contract/agreement
        const hasContract = Array.from(typesPresent).some((t: any) => /contract|agreement/.test(t))
        if (!hasContract) {
          suggestions.push({
            id: 'missing-contract-agreement',
            title: '缺少合同或协议',
            description: '未发现合同或协议类证据，可能影响权利义务认定。',
            priority: 'MEDIUM',
            reason: 'No evidence_type matches contract / agreement.',
            suggested_action: 'ask_client_to_provide_contract'
          })
        }

        // missing chat/message
        const hasChat = Array.from(typesPresent).some((t: any) => /chat|message|wechat/.test(t))
        if (!hasChat) {
          suggestions.push({
            id: 'missing-chat-record',
            title: '缺少聊天记录',
            description: '未发现聊天或消息类证据（如微信、短信、聊天导出）。',
            priority: 'MEDIUM',
            reason: 'No evidence_type matches chat / message / wechat.',
            suggested_action: 'ask_client_to_provide_chat_records'
          })
        }

        return suggestions.slice(0, 3)
      })(allEvidence, Number(total))

      const evidence_next_steps = (function computeNextSteps(missing: any[], selected: any, totalCount: number) {
        const steps: any[] = []
        const hasHighMissing = Array.isArray(missing) && missing.some((m: any) => (m.priority || '').toUpperCase() === 'HIGH')

        if (hasHighMissing) {
          steps.push({
            id: 'next-collect-high',
            title: '优先补充关键证据',
            description: '存在高优先级的缺失证据，建议优先补充。',
            priority: 'HIGH',
            reason: 'High priority missing evidence detected.',
            suggested_action: 'collect_missing_high_priority_evidence',
            status: 'suggested'
          })
        }

        if (!totalCount || totalCount === 0) {
          steps.push({
            id: 'next-collect-basic',
            title: '先收集基础证据',
            description: '当前未发现证据，需先收集基础证据材料。',
            priority: 'HIGH',
            reason: 'No evidence present.',
            suggested_action: 'collect_basic_evidence',
            status: 'suggested'
          })
        }

        try {
          const score = selected && selected.ai_summary && typeof selected.ai_summary.score === 'number' ? Number(selected.ai_summary.score) : null
          if (score !== null && score < 60) {
            steps.push({
              id: 'next-improve-selected',
              title: '补强当前证据',
              description: '当前证据完整性或质量较低，建议补强。',
              priority: 'MEDIUM',
              reason: 'Selected evidence score below threshold.',
              suggested_action: 'improve_selected_evidence',
              status: 'suggested'
            })
          }
        } catch (e) { }

        if ((!Array.isArray(missing) || missing.length === 0) && totalCount > 0) {
          steps.push({
            id: 'next-prepare-catalog',
            title: '整理证据目录',
            description: '证据齐全，建议整理证据目录以便后续工作。',
            priority: 'MEDIUM',
            reason: 'No missing evidence and evidence present.',
            suggested_action: 'prepare_evidence_catalog',
            status: 'suggested'
          })
        }

        return steps.slice(0, 3)
      })(missing_suggestions, selected_evidence, Number(total))

      return reply.code(200).send({
        matter: { matter_id: m.matter_id, title: m.title, status: m.status },
        summary,
        evidence_list: evidence_list_mapped,
        navigation: { by_type, by_status, by_strength },
        selected_evidence,
        ai_analysis: { status: 'placeholder', message: 'AI evidence analysis coming soon' },
        missing_evidence: missing_suggestions,
        evidence_next_steps,
      })
    } catch (err: any) {
      return reply.code(500).send({ error: 'evidence workspace failed', detail: err?.message || String(err) })
    }
  })

  // Document Workspace - read-only dashboard
  app.get('/matters/:matter_id/documents/workspace', async (request, reply) => {
    const { matter_id } = request.params as any
    try {
      const m = await service.get(matter_id)
      if (!m) return reply.code(404).send({ error: 'Not found' })

      const total = await prisma.document.count({ where: { matter_id } }).catch(() => 0)
      const completed = await prisma.document.count({ where: { matter_id, status: 'completed' } }).catch(() => 0)
      const draft = await prisma.document.count({ where: { matter_id, status: 'draft' } }).catch(() => 0)
      const need_review = await prisma.document.count({ where: { matter_id, status: 'need_review' } }).catch(() => 0)

      const summary = {
        total: Number(total),
        completed: Number(completed),
        draft: Number(draft),
        need_review: Number(need_review),
        missing: 0,
      }

      const document_list = await prisma.document.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' }, take: 20, select: { document_id: true, title: true, document_type: true, status: true, version: true, updated_at: true, content_uri: true } }).catch(() => [])

      // build navigation
      const types = ['complaint', 'defense', 'representation', 'evidence_catalog', 'challenge_opinion', 'hearing_outline', 'enforcement', 'preservation', 'other']
      const by_type = await Promise.all(types.map(async (t) => {
        const c = await prisma.document.count({ where: { matter_id, document_type: t } }).catch(() => 0)
        return { key: t, label: t, count: Number(c), description: '' }
      }))

      const statuses = ['draft', 'completed', 'need_review', 'archived']
      const by_status = await Promise.all(statuses.map(async (s) => {
        const c = await prisma.document.count({ where: { matter_id, status: s } }).catch(() => 0)
        return { key: s, label: s, count: Number(c), description: '' }
      }))

      // versions
      const v1 = await prisma.document.count({ where: { matter_id, version: 'v1' } }).catch(() => 0)
      const v2 = await prisma.document.count({ where: { matter_id, version: 'v2' } }).catch(() => 0)
      const outdated = await prisma.document.count({ where: { matter_id, status: 'archived' } }).catch(() => 0)
      const totalCount = Number(total)
      const latest = Math.max(0, totalCount - (Number(v1) + Number(v2) + Number(outdated)))
      const by_version = [
        { key: 'latest', label: 'latest', count: Number(latest), description: '' },
        { key: 'v1', label: 'v1', count: Number(v1), description: '' },
        { key: 'v2', label: 'v2', count: Number(v2), description: '' },
        { key: 'outdated', label: 'outdated', count: Number(outdated), description: '' },
      ]

      // selected_document: choose first item from document_list and provide read-only detail
      let selected_document: any = null
      if (Array.isArray(document_list) && document_list.length > 0) {
        const first = document_list[0]
        const updated_at = first.updated_at ? (first.updated_at instanceof Date ? first.updated_at.toISOString() : String(first.updated_at)) : null

        // simple rule-based ai_summary (deterministic, local)
        const computeAi = (doc: any) => {
          let score = 50
          const strengths: string[] = []
          const risks: string[] = []
          const recommendations: string[] = []

          if (doc.content_uri && String(doc.content_uri).trim().length > 0) {
            score += 20
            strengths.push('Content URI available')
          } else {
            risks.push('No content URI')
            recommendations.push('Attach or provide content URI for this document')
          }

          if (doc.version) {
            score += 10
            strengths.push(`Version ${doc.version}`)
          }

          if (doc.title && String(doc.title).trim().length > 10) {
            score += 10
            strengths.push('Detailed title')
          }

          if (score > 100) score = 100

          let completeness = 'low'
          if (score >= 80) completeness = 'high'
          else if (score >= 60) completeness = 'medium'

          return {
            status: 'rule_based',
            score: Number(score),
            completeness,
            strengths,
            risks,
            recommendations,
          }
        }

        selected_document = {
          document_id: first.document_id,
          title: first.title,
          document_type: first.document_type,
          status: first.status,
          version: first.version,
          updated_at,
          content_uri: first.content_uri ?? null,
          related_materials: [],
          related_evidence: [],
          lawyer_notes: { status: 'read_only', message: 'Lawyer notes coming soon' },
          ai_summary: computeAi(first),
        }
      }

      return reply.code(200).send({
        matter: { matter_id: m.matter_id, title: m.title, status: m.status },
        summary,
        navigation: { by_type, by_status, by_version },
        document_list: Array.isArray(document_list) ? document_list : [],
        selected_document,
        ai_analysis: { status: 'placeholder', message: 'AI document analysis coming soon' },
        missing_documents: [],
        document_next_steps: [],
      })
    } catch (err: any) {
      return reply.code(500).send({ error: 'documents workspace failed', detail: err?.message || String(err) })
    }
  })

  app.delete('/matters/:id/materials/:material_id', async (request, reply) => {
    const { material_id } = request.params as any;
    try {
      await materialService.deleteByMaterialId(material_id);
      return reply.code(204).send();
    } catch (err: any) {
      return reply.code(404).send({ error: 'Not found or delete failed', detail: err?.message || String(err) });
    }
  });

  app.post('/matters/:id/evidence', async (request, reply) => {
    const { id } = request.params as any;
    const payload = request.body as any;
    // Support two payload shapes:
    // - full: { evidence_id, material_id, title, ... }
    // - minimal: { title, type?, status? }
    const title = String(payload.title || '').trim()
    if (!title) return reply.code(400).send({ error: 'title required' })

    try {
      // ensure material exists: use provided material_id or create a placeholder material
      let material_id = String(payload.material_id || '')
      if (!material_id) {
        // generate a lightweight material to attach evidence to
        material_id = `mat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        try {
          await materialService.createForMatter(id, { material_id, title: `Auto material for ${title}`, material_type: 'uploaded', source: 'upload', storage_uri: '', status: 'active' })
        } catch (e) {
          // ignore creation error and proceed; createForMatter may fail if material exists
        }
      }

      const evidence_id = String(payload.evidence_id || `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`)
      const evPayload: any = {
        evidence_id,
        material_id,
        title,
        evidence_type: String(payload.type || payload.evidence_type || ''),
        description: String(payload.description || ''),
        relevance: String(payload.relevance || ''),
        status: String(payload.status || 'uploaded'),
      }

      const created = await evidenceService.createForMatter(id, evPayload)

      return reply.code(201).send(created)
    } catch (err: any) {
      return reply.code(500).send({ error: 'create failed', detail: err?.message || String(err) })
    }
  });

  // Restore legacy GET evidence list endpoint for compatibility
  app.get('/matters/:id/evidence', async (request, reply) => {
    const { id } = request.params as any
    try {
      const list = await evidenceService.listByMatter(id)
      return reply.code(200).send(list)
    } catch (err: any) {
      return reply.code(500).send({ error: 'failed', detail: err?.message || String(err) })
    }
  })

  // Facts CRUD - minimal API
  app.post('/matters/:id/facts', async (request, reply) => {
    const { id } = request.params as any;
    const payload = request.body as any || {};
    const title = String(payload.title || '').trim();
    if (!title) return reply.code(400).send({ error: 'title required' });
    try {
      const created = await factService.createFact(id, { title, description: String(payload.description || ''), status: String(payload.status || 'draft') });
      return reply.code(201).send(created);
    } catch (err: any) {
      return reply.code(500).send({ error: 'create_failed', detail: err?.message || String(err) });
    }
  });

  app.get('/matters/:id/facts', async (request, reply) => {
    const { id } = request.params as any;
    try {
      const list = await factService.listFacts(id);
      return reply.code(200).send(list);
    } catch (err: any) {
      return reply.code(500).send({ error: 'failed', detail: err?.message || String(err) });
    }
  });

  // Attach evidence to fact
  app.post('/matters/:matter_id/facts/:fact_id/evidence', async (request, reply) => {
    const { matter_id, fact_id } = request.params as any;
    const payload = request.body as any || {};
    if (!payload || !payload.evidence_id) return reply.code(400).send({ error: 'evidence_id required' });
    try {
      const attached = await factService.attachEvidenceToFact(matter_id, fact_id, String(payload.evidence_id), typeof payload.note === 'string' ? String(payload.note) : undefined);
      return reply.code(201).send(attached);
    } catch (err: any) {
      const msg = String(err.message || err);
      if (msg === 'fact_not_found') return reply.code(404).send({ error: 'fact_not_found' });
      if (msg === 'fact_mismatch') return reply.code(400).send({ error: 'fact_mismatch' });
      if (msg === 'evidence_not_found') return reply.code(404).send({ error: 'evidence_not_found' });
      return reply.code(500).send({ error: 'attach_failed', detail: err?.message || String(err) });
    }
  });

  // Detach evidence from fact
  app.delete('/matters/:matter_id/facts/:fact_id/evidence/:evidence_id', async (request, reply) => {
    const { matter_id, fact_id, evidence_id } = request.params as any;
    try {
      const res = await factService.detachEvidenceFromFact(matter_id, fact_id, evidence_id);
      return reply.code(200).send(res);
    } catch (err: any) {
      const msg = String(err.message || err);
      if (msg === 'fact_not_found') return reply.code(404).send({ error: 'fact_not_found' });
      if (msg === 'fact_mismatch') return reply.code(400).send({ error: 'fact_mismatch' });
      if (msg === 'evidence_not_found') return reply.code(404).send({ error: 'evidence_not_found' });
      return reply.code(500).send({ error: 'delete_failed', detail: err?.message || String(err) });
    }
  });

  app.get('/matters/:matter_id/facts/:fact_id', async (request, reply) => {
    const { fact_id } = request.params as any;
    try {
      const f = await factService.getFact(fact_id);
      if (!f) return reply.code(404).send({ error: 'not_found' });
      return reply.code(200).send(f);
    } catch (err: any) {
      return reply.code(500).send({ error: 'failed', detail: err?.message || String(err) });
    }
  });

  app.patch('/matters/:matter_id/facts/:fact_id', async (request, reply) => {
    const { fact_id } = request.params as any;
    const payload = request.body as any || {};
    const patch: any = {};
    if (typeof payload.title === 'string') patch.title = String(payload.title);
    if (typeof payload.description === 'string') patch.description = String(payload.description);
    if (typeof payload.status === 'string') patch.status = String(payload.status);
    if (Object.keys(patch).length === 0) return reply.code(400).send({ error: 'nothing to update' });
    try {
      const updated = await factService.updateFact(fact_id, patch);
      return reply.code(200).send(updated);
    } catch (err: any) {
      if (String(err.message) === 'Not found') return reply.code(404).send({ error: 'not_found' });
      return reply.code(500).send({ error: 'update_failed', detail: err?.message || String(err) });
    }
  });

  app.delete('/matters/:matter_id/facts/:fact_id', async (request, reply) => {
    const { fact_id } = request.params as any;
    try {
      await factService.deleteFact(fact_id);
      return reply.code(204).send();
    } catch (err: any) {
      if (String(err.message) === 'Not found') return reply.code(404).send({ error: 'not_found' });
      return reply.code(500).send({ error: 'delete_failed', detail: err?.message || String(err) });
    }
  });

  // Update evidence description (lawyer notes)
  app.patch('/matters/:matter_id/evidence/:evidence_id', async (request, reply) => {
    const { matter_id, evidence_id } = request.params as any
    const payload = request.body as any
    if (!payload || typeof payload.description !== 'string') return reply.code(400).send({ error: 'description required' })
    try {
      const updated = await evidenceService.updateDescription(matter_id, evidence_id, String(payload.description))
      return reply.code(200).send(updated)
    } catch (err: any) {
      if (String(err.message) === 'evidence_not_found') return reply.code(404).send({ error: 'evidence_not_found' })
      return reply.code(500).send({ error: 'update_failed', detail: err?.message || String(err) })
    }
  })

  // Update evidence status
  app.patch('/matters/:matter_id/evidence/:evidence_id/status', async (request, reply) => {
    const { matter_id, evidence_id } = request.params as any
    const payload = request.body as any
    const allowed = ['active', 'pending', 'accepted', 'weak', 'rejected']
    if (!payload || typeof payload.status !== 'string') return reply.code(400).send({ error: 'status required' })
    if (!allowed.includes(String(payload.status))) return reply.code(400).send({ error: 'invalid_status' })
    try {
      const updated = await evidenceService.updateStatus(matter_id, evidence_id, String(payload.status))
      return reply.code(200).send(updated)
    } catch (err: any) {
      if (String(err.message) === 'evidence_not_found') return reply.code(404).send({ error: 'evidence_not_found' })
      if (String(err.message) === 'invalid_status') return reply.code(400).send({ error: 'invalid_status' })
      return reply.code(500).send({ error: 'update_failed', detail: err?.message || String(err) })
    }
  })

  app.post('/matters/:id/timeline', async (request, reply) => {
    const { id } = request.params as any;
    const payload = request.body as any;
    if (!payload.timeline_id || !payload.event_type || !payload.event_time) return reply.code(400).send({ error: 'timeline_id, event_type and event_time required' });
    try {
      const created = await timelineService.createForMatter(id, payload);
      return reply.code(201).send(created);
    } catch (err: any) {
      return reply.code(500).send({ error: 'create failed', detail: err?.message || String(err) });
    }
  });

  app.post('/matters', async (request, reply) => {
    const payload = request.body as any;
    if (!payload.matter_id || !payload.title) return reply.code(400).send({ error: 'matter_id and title required' });
    try {
      const created = await service.create(payload);
      // return both legacy fields and new fields for compatibility with tests and frontend
      return reply.code(201).send({
        matter_id: created.matter_id,
        title: created.title,
        description: created.description,
        matter_type: created.matter_type,
        status: created.status,
        created_at: created.created_at,
        updated_at: created.updated_at,
        matterId: created.matter_id,
        matter: created,
      });
    } catch (err: any) {
      // handle unique constraint (matter already exists)
      const code = err?.code || err?.meta?.code || null
      const message = String(err?.message || err)
      if (code === 'P2002' || /unique constraint/i.test(message) || /already exists/i.test(message)) {
        try {
          const existing = await service.get(payload.matter_id);
          if (existing) return reply.code(200).send({
            matter_id: existing.matter_id,
            title: existing.title,
            description: existing.description,
            matter_type: existing.matter_type,
            status: existing.status,
            created_at: existing.created_at,
            updated_at: existing.updated_at,
            matterId: existing.matter_id,
            matter: existing,
          });
        } catch (e) {
          // fall through to error
        }
        return reply.code(409).send({ error: 'matter_exists' });
      }
      return reply.code(500).send({ error: 'create_failed', detail: message });
    }
  });

  app.patch('/matters/:id', async (request, reply) => {
    const { id } = request.params as any;
    const patch = request.body as any;
    try {
      const updated = await service.update(id, patch);
      return updated;
    } catch (err) {
      return reply.code(404).send({ error: 'Not found or update failed' });
    }
  });

  app.delete('/matters/:id', async (request, reply) => {
    const { id } = request.params as any;
    try {
      await service.remove(id);
      return reply.code(204).send();
    } catch (err) {
      return reply.code(404).send({ error: 'Not found or delete failed' });
    }
  });
}

export default matterRoutes;
