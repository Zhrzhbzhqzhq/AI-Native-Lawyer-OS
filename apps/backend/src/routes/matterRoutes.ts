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
  const NextStepEngine = (await import('../runtime/nextStepEngine')).default;
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
        const engine = new NextStepEngine()
        const ai_next_steps = engine.evaluate({
          materialsCount: summary.materials,
          evidenceCount: summary.evidence,
          documentsCount: summary.documents,
          recentActivityCount: recent_activity.length,
        })

        return reply.code(200).send({
          matter: { matter_id: m.matter_id, title: m.title, status: m.status },
          summary,
          object_navigation,
          recent_materials,
          recent_evidence,
          recent_documents,
          recent_activity,
          ai_next_steps,
        })
      } catch (e) {
        // fallback: still return workspace without ai_next_steps
        return reply.code(200).send({
          matter: { matter_id: m.matter_id, title: m.title, status: m.status },
          summary,
          object_navigation,
          recent_materials,
          recent_evidence,
          recent_documents,
          recent_activity,
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
        ...recent_materials.map((m:any) => ({ type: 'material_uploaded', time: m.created_at ? (m.created_at instanceof Date ? m.created_at.toISOString() : String(m.created_at)) : null })),
        ...recent_evidence.map((e:any) => ({ type: 'evidence_created', time: e.created_at ? (e.created_at instanceof Date ? e.created_at.toISOString() : String(e.created_at)) : null })),
        ...recent_documents.map((d:any) => ({ type: 'document_updated', time: d.created_at ? (d.created_at instanceof Date ? d.created_at.toISOString() : String(d.created_at)) : null })),
      ]

      const NextStepEngine = (await import('../runtime/nextStepEngine')).default
      const engine = new NextStepEngine()
      const steps = engine.evaluate({
        materialsCount: summary.materials,
        evidenceCount: summary.evidence,
        documentsCount: summary.documents,
        recentActivityCount: recent_activity.length,
      })

      return reply.code(200).send({ matter_id, steps })
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
      const weak = Array.isArray(allEvidence) ? allEvidence.filter((e:any) => !e.relevance || !e.description).length : 0

      const summary = {
        total: Number(total),
        accepted: Number(accepted),
        pending: Number(pending),
        weak: Number(weak),
        missing: 0,
      }

      const evidence_list = await prisma.evidence.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' }, take: 20, select: { evidence_id: true, title: true, evidence_type: true, status: true, relevance: true, description: true, material_id: true, updated_at: true } }).catch(() => [])
      // ensure `source` field exists for frontend compatibility
      const evidence_list_mapped = (Array.isArray(evidence_list) ? evidence_list : []).map((e:any) => ({ ...e, source: (e as any).source ?? 'unknown' }))

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
          ai_summary: (function computeAiSummary(ev:any, rm:any) {
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
      const types = ['electronic','physical','recording','photo','video','contract','transfer','chat','witness','other']
      const by_type = await Promise.all(types.map(async (t) => {
        const c = await prisma.evidence.count({ where: { matter_id, evidence_type: t } }).catch(() => 0)
        return { key: t, label: t, count: Number(c), description: '' }
      }))

      const statuses = ['active','pending','accepted','weak','rejected']
      const by_status = await Promise.all(statuses.map(async (s) => {
        const c = await prisma.evidence.count({ where: { matter_id, status: s } }).catch(() => 0)
        return { key: s, label: s, count: Number(c), description: '' }
      }))

      // strength rules
      const strong = await prisma.evidence.count({ where: { matter_id, status: 'accepted' } }).catch(() => 0)
      const medium = await prisma.evidence.count({ where: { matter_id, status: { in: ['active','pending','draft'] } } }).catch(() => 0)
      const weakCount = await prisma.evidence.count({ where: { matter_id, OR: [{ relevance: '' }, { description: '' }] } }).catch(() => 0)
      const totalCount = Number(total)
      const unknown = Math.max(0, totalCount - (Number(strong) + Number(medium) + Number(weakCount)))
      const by_strength = [
        { key: 'strong', label: 'strong', count: Number(strong), description: '' },
        { key: 'medium', label: 'medium', count: Number(medium), description: '' },
        { key: 'weak', label: 'weak', count: Number(weakCount), description: '' },
        { key: 'unknown', label: 'unknown', count: Number(unknown), description: '' },
      ]

      return reply.code(200).send({
        matter: { matter_id: m.matter_id, title: m.title, status: m.status },
        summary,
        evidence_list: evidence_list_mapped,
        navigation: { by_type, by_status, by_strength },
        selected_evidence,
        ai_analysis: { status: 'placeholder', message: 'AI evidence analysis coming soon' },
        missing_evidence: [],
      })
    } catch (err: any) {
      return reply.code(500).send({ error: 'evidence workspace failed', detail: err?.message || String(err) })
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
