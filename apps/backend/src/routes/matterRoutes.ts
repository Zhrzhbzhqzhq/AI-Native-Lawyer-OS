import { FastifyInstance } from 'fastify';
import { createPrismaClient } from '@lawdesk/database';
import MatterService from '../services/matterService';
import TimelineService from '../services/timelineService';

export async function matterRoutes(app: FastifyInstance) {
  const prisma = createPrismaClient();
  const service = new MatterService(prisma);
  const timelineService = new TimelineService(prisma);
  const evidenceService = new (await import('../services/evidenceService')).default(prisma);
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
    const { id } = request.params as any;
    const list = await timelineService.listByMatter(id);
    return list;
  });

  app.get('/matters/:id/evidence', async (request, reply) => {
    const { id } = request.params as any;
    const list = await evidenceService.listByMatter(id);
    return list;
  });

  app.get('/matters/:id/materials', async (request, reply) => {
    const { id } = request.params as any;
    const list = await materialService.listByMatter(id);
    return list;
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
    if (!payload || !['approved','rejected'].includes(payload.status)) return reply.code(400).send({ error: 'invalid status' });
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
    if (!['user','assistant','system'].includes(payload.role)) return reply.code(400).send({ error: 'invalid role' });
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
      const materials = await materialService.listByMatter(matter_id).catch(() => [])
      const evidence = await evidenceService.listByMatter(matter_id).catch(() => [])
      const documents = await documentService.listByMatter(matter_id).catch(() => [])

      const summary = {
        materials: Array.isArray(materials) ? materials.length : 0,
        evidence: Array.isArray(evidence) ? evidence.length : 0,
        documents: Array.isArray(documents) ? documents.length : 0,
        // placeholder: do not invoke AI/runtime in this read-only alpha endpoint
        pending_ai_suggestions: 0,
      }

      const recent_materials = Array.isArray(materials) ? materials.slice(0, 5) : []
      const recent_evidence = Array.isArray(evidence) ? evidence.slice(0, 5) : []
      const recent_documents = Array.isArray(documents) ? documents.slice(0, 5) : []

      return reply.code(200).send({
        matter: { matter_id: m.matter_id, title: m.title, status: m.status },
        summary,
        recent_materials,
        recent_evidence,
        recent_documents,
      })
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
    // require evidence_id, material_id, title
    if (!payload.evidence_id || !payload.material_id || !payload.title) return reply.code(400).send({ error: 'evidence_id, material_id and title required' });
    try {
      const created = await evidenceService.createForMatter(id, payload);
      return reply.code(201).send(created);
    } catch (err: any) {
      return reply.code(500).send({ error: 'create failed', detail: err?.message || String(err) });
    }
  });

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
    const created = await service.create(payload);
    return reply.code(201).send(created);
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
