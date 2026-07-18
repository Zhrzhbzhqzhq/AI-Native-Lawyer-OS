import type { PrismaClient } from '@lawdesk/database'

export type MatterPurgeResult = {
  matter_id: string
  found: boolean
  deleted: Record<string, number>
  remaining: Record<string, number>
}

export type DevResetResult = {
  success: boolean
  deleted: Record<string, number>
  remaining: Record<string, number>
}

const ZERO_RESULT_TABLES = [
  'matter',
  'materials',
  'evidence',
  'fact_drafts',
  'facts',
  'issue_drafts',
  'issues',
  'law_drafts',
  'law_issue',
  'laws',
  'argument_drafts',
  'argument_fact',
  'argument_issue',
  'argument_law',
  'arguments',
  'document_drafts',
  'document_argument',
  'document_fact',
  'document_issue',
  'document_law',
  'documents',
  'tasks',
  'execution',
  'ai_records',
  'workspaces',
  'timelines',
  'knowledge',
  'clients',
  'workflow_events',
] as const

function countDeleted(result: unknown): number {
  if (result && typeof result === 'object' && 'count' in result) {
    const value = (result as { count?: unknown }).count
    return typeof value === 'number' ? value : 0
  }
  return 0
}

function emptyCounts() {
  return Object.fromEntries(ZERO_RESULT_TABLES.map((key) => [key, 0]))
}

export class DevMatterPurgeService {
  constructor(private prisma: PrismaClient) {}

  async resetBusinessData(): Promise<DevResetResult> {
    return this.prisma.$transaction(async (tx: any) => {
      await this.clearOptionalReferences(tx)

      const deleted: Record<string, number> = emptyCounts()

      deleted.fact_evidence = countDeleted(await tx.factEvidence.deleteMany({}))
      deleted.issue_fact = countDeleted(await tx.issueFact.deleteMany({}))
      deleted.law_issue = countDeleted(await tx.lawIssue.deleteMany({}))
      deleted.argument_fact = countDeleted(await tx.argumentFact.deleteMany({}))
      deleted.argument_issue = countDeleted(await tx.argumentIssue.deleteMany({}))
      deleted.argument_law = countDeleted(await tx.argumentLaw.deleteMany({}))
      deleted.document_argument = countDeleted(await tx.documentArgument.deleteMany({}))
      deleted.document_fact = countDeleted(await tx.documentFact.deleteMany({}))
      deleted.document_issue = countDeleted(await tx.documentIssue.deleteMany({}))
      deleted.document_law = countDeleted(await tx.documentLaw.deleteMany({}))
      deleted.ai_records = countDeleted(await tx.aiRecord.deleteMany({}))
      deleted.document_drafts = countDeleted(await tx.documentDraft.deleteMany({}))
      deleted.argument_drafts = countDeleted(await tx.argumentDraft.deleteMany({}))
      deleted.arguments = countDeleted(await tx.argument.deleteMany({}))
      deleted.clients = countDeleted(await tx.client.deleteMany({}))
      deleted.documents = countDeleted(await tx.document.deleteMany({}))
      deleted.evidence = countDeleted(await tx.evidence.deleteMany({}))
      deleted.fact_drafts = countDeleted(await tx.factDraft.deleteMany({}))
      deleted.facts = countDeleted(await tx.fact.deleteMany({}))
      deleted.issue_drafts = countDeleted(await tx.issueDraft.deleteMany({}))
      deleted.issues = countDeleted(await tx.issue.deleteMany({}))
      deleted.law_drafts = countDeleted(await tx.lawDraft.deleteMany({}))
      deleted.knowledge = countDeleted(await tx.knowledge.deleteMany({}))
      deleted.laws = countDeleted(await tx.law.deleteMany({}))
      deleted.materials = countDeleted(await tx.material.deleteMany({}))
      deleted.tasks = countDeleted(await tx.task.deleteMany({}))
      deleted.timelines = countDeleted(await tx.timeline.deleteMany({}))
      deleted.workflow_events = countDeleted(await tx.workflowEvent.deleteMany({}))
      deleted.workspaces = countDeleted(await tx.workspace.deleteMany({}))
      deleted.execution = countDeleted(await tx.executionQueueItem.deleteMany({}))
      deleted.matter = countDeleted(await tx.matter.deleteMany({}))

      const remaining = await this.countAllBusinessData(tx)

      return {
        success: Object.values(remaining).every((count) => count === 0),
        deleted,
        remaining,
      }
    })
  }

  async purgeMatter(matter_id: string): Promise<MatterPurgeResult> {
    const result = await this.prisma.$transaction(async (tx: any) => {
      const existing = await tx.matter.findUnique({ where: { matter_id } })
      const deleted: Record<string, number> = emptyCounts()

      if (!existing) {
        return {
          matter_id,
          found: false,
          deleted,
          remaining: await this.countRemaining(tx, matter_id),
        }
      }

      await this.clearOptionalReferences(tx, matter_id)

      // Keep this order aligned with the developer-only purge contract.
      deleted.fact_evidence = countDeleted(await tx.factEvidence.deleteMany({
        where: { fact: { matter_id } },
      }))
      deleted.issue_fact = countDeleted(await tx.issueFact.deleteMany({
        where: { OR: [{ fact: { matter_id } }, { issue: { matter_id } }] },
      }))
      deleted.law_issue = countDeleted(await tx.lawIssue.deleteMany({
        where: { OR: [{ law: { matter_id } }, { issue: { matter_id } }] },
      }))
      deleted.argument_fact = countDeleted(await tx.argumentFact.deleteMany({
        where: { OR: [{ argument: { matter_id } }, { fact: { matter_id } }] },
      }))
      deleted.argument_issue = countDeleted(await tx.argumentIssue.deleteMany({
        where: { OR: [{ argument: { matter_id } }, { issue: { matter_id } }] },
      }))
      deleted.argument_law = countDeleted(await tx.argumentLaw.deleteMany({
        where: { OR: [{ argument: { matter_id } }, { law: { matter_id } }] },
      }))
      deleted.document_argument = countDeleted(await tx.documentArgument.deleteMany({
        where: { OR: [{ document: { matter_id } }, { argument: { matter_id } }] },
      }))
      deleted.document_fact = countDeleted(await tx.documentFact.deleteMany({
        where: { OR: [{ document: { matter_id } }, { fact: { matter_id } }] },
      }))
      deleted.document_issue = countDeleted(await tx.documentIssue.deleteMany({
        where: { OR: [{ document: { matter_id } }, { issue: { matter_id } }] },
      }))
      deleted.document_law = countDeleted(await tx.documentLaw.deleteMany({
        where: { OR: [{ document: { matter_id } }, { law: { matter_id } }] },
      }))
      deleted.ai_records = countDeleted(await tx.aiRecord.deleteMany({ where: { matter_id } }))
      deleted.document_drafts = countDeleted(await tx.documentDraft.deleteMany({ where: { matter_id } }))
      deleted.argument_drafts = countDeleted(await tx.argumentDraft.deleteMany({ where: { matter_id } }))
      deleted.arguments = countDeleted(await tx.argument.deleteMany({ where: { matter_id } }))
      deleted.clients = countDeleted(await tx.client.deleteMany({ where: { matter_id } }))
      deleted.documents = countDeleted(await tx.document.deleteMany({ where: { matter_id } }))
      deleted.evidence = countDeleted(await tx.evidence.deleteMany({ where: { matter_id } }))
      deleted.fact_drafts = countDeleted(await tx.factDraft.deleteMany({ where: { matter_id } }))
      deleted.facts = countDeleted(await tx.fact.deleteMany({ where: { matter_id } }))
      deleted.issue_drafts = countDeleted(await tx.issueDraft.deleteMany({ where: { matter_id } }))
      deleted.issues = countDeleted(await tx.issue.deleteMany({ where: { matter_id } }))
      deleted.law_drafts = countDeleted(await tx.lawDraft.deleteMany({ where: { matter_id } }))
      deleted.knowledge = countDeleted(await tx.knowledge.deleteMany({ where: { matter_id } }))
      deleted.laws = countDeleted(await tx.law.deleteMany({ where: { matter_id } }))
      deleted.materials = countDeleted(await tx.material.deleteMany({ where: { matter_id } }))
      deleted.tasks = countDeleted(await tx.task.deleteMany({ where: { matter_id } }))
      deleted.timelines = countDeleted(await tx.timeline.deleteMany({ where: { matter_id } }))
      deleted.workflow_events = countDeleted(await tx.workflowEvent.deleteMany({ where: { matter_id } }))
      deleted.workspaces = countDeleted(await tx.workspace.deleteMany({ where: { matter_id } }))
      deleted.execution = countDeleted(await tx.executionQueueItem.deleteMany({ where: { matter_id } }))
      deleted.matter = countDeleted(await tx.matter.deleteMany({ where: { matter_id } }))

      return {
        matter_id,
        found: true,
        deleted,
        remaining: await this.countRemaining(tx, matter_id),
      }
    })

    return result
  }

  private async clearOptionalReferences(tx: any, matter_id?: string) {
    const where = matter_id ? { matter_id } : {}

    await tx.workspace.updateMany({
      where,
      data: {
        task_id: null,
        timeline_id: null,
        document_id: null,
        material_id: null,
        evidence_id: null,
        workflow_event_id: null,
        ai_record_id: null,
        knowledge_id: null,
      },
    })

    await tx.knowledge.updateMany({
      where,
      data: {
        document_id: null,
        material_id: null,
        evidence_id: null,
        task_id: null,
        timeline_id: null,
        workflow_event_id: null,
        ai_record_id: null,
      },
    })

    await tx.workflowEvent.updateMany({
      where,
      data: {
        timeline_id: null,
        task_id: null,
        document_id: null,
        evidence_id: null,
        ai_record_id: null,
      },
    })

    await tx.timeline.updateMany({
      where,
      data: {
        task_id: null,
        document_id: null,
        material_id: null,
        evidence_id: null,
        ai_record_id: null,
      },
    })

    await tx.aiRecord.updateMany({
      where,
      data: {
        task_id: null,
        timeline_id: null,
        document_id: null,
        material_id: null,
        evidence_id: null,
        workflow_event_id: null,
        knowledge_id: null,
      },
    })

    await tx.task.updateMany({
      where,
      data: {
        client_id: null,
        material_id: null,
        evidence_id: null,
        document_id: null,
      },
    })

    await tx.document.updateMany({
      where,
      data: {
        material_id: null,
        evidence_id: null,
        argument_id: null,
      },
    })

    await tx.argument.updateMany({ where, data: { issue_id: null } })
    await tx.law.updateMany({ where, data: { issue_id: null } })
  }

  private async countRemaining(tx: any, matter_id: string): Promise<Record<string, number>> {
    const [
      matter,
      materials,
      evidence,
      factDrafts,
      facts,
      issueDrafts,
      issues,
      lawDrafts,
      lawIssue,
      laws,
      argumentDrafts,
      argumentFact,
      argumentIssue,
      argumentLaw,
      args,
      documentDrafts,
      documentArgument,
      documentFact,
      documentIssue,
      documentLaw,
      documents,
      tasks,
      execution,
      aiRecords,
      workspaces,
      timelines,
      knowledge,
      clients,
      workflowEvents,
    ] = await Promise.all([
      tx.matter.count({ where: { matter_id } }),
      tx.material.count({ where: { matter_id } }),
      tx.evidence.count({ where: { matter_id } }),
      tx.factDraft.count({ where: { matter_id } }),
      tx.fact.count({ where: { matter_id } }),
      tx.issueDraft.count({ where: { matter_id } }),
      tx.issue.count({ where: { matter_id } }),
      tx.lawDraft.count({ where: { matter_id } }),
      tx.lawIssue.count({ where: { OR: [{ law: { matter_id } }, { issue: { matter_id } }] } }),
      tx.law.count({ where: { matter_id } }),
      tx.argumentDraft.count({ where: { matter_id } }),
      tx.argumentFact.count({ where: { OR: [{ argument: { matter_id } }, { fact: { matter_id } }] } }),
      tx.argumentIssue.count({ where: { OR: [{ argument: { matter_id } }, { issue: { matter_id } }] } }),
      tx.argumentLaw.count({ where: { OR: [{ argument: { matter_id } }, { law: { matter_id } }] } }),
      tx.argument.count({ where: { matter_id } }),
      tx.documentDraft.count({ where: { matter_id } }),
      tx.documentArgument.count({ where: { OR: [{ document: { matter_id } }, { argument: { matter_id } }] } }),
      tx.documentFact.count({ where: { OR: [{ document: { matter_id } }, { fact: { matter_id } }] } }),
      tx.documentIssue.count({ where: { OR: [{ document: { matter_id } }, { issue: { matter_id } }] } }),
      tx.documentLaw.count({ where: { OR: [{ document: { matter_id } }, { law: { matter_id } }] } }),
      tx.document.count({ where: { matter_id } }),
      tx.task.count({ where: { matter_id } }),
      tx.executionQueueItem.count({ where: { matter_id } }),
      tx.aiRecord.count({ where: { matter_id } }),
      tx.workspace.count({ where: { matter_id } }),
      tx.timeline.count({ where: { matter_id } }),
      tx.knowledge.count({ where: { matter_id } }),
      tx.client.count({ where: { matter_id } }),
      tx.workflowEvent.count({ where: { matter_id } }),
    ])

    return {
      matter,
      materials,
      evidence,
      fact_drafts: factDrafts,
      facts,
      issue_drafts: issueDrafts,
      issues,
      law_drafts: lawDrafts,
      law_issue: lawIssue,
      laws,
      argument_drafts: argumentDrafts,
      argument_fact: argumentFact,
      argument_issue: argumentIssue,
      argument_law: argumentLaw,
      arguments: args,
      document_drafts: documentDrafts,
      document_argument: documentArgument,
      document_fact: documentFact,
      document_issue: documentIssue,
      document_law: documentLaw,
      documents,
      tasks,
      execution,
      ai_records: aiRecords,
      workspaces,
      timelines,
      knowledge,
      clients,
      workflow_events: workflowEvents,
    }
  }

  private async countAllBusinessData(tx: any): Promise<Record<string, number>> {
    const [
      matter,
      materials,
      evidence,
      factDrafts,
      facts,
      issueDrafts,
      issues,
      lawDrafts,
      lawIssue,
      laws,
      argumentDrafts,
      argumentFact,
      argumentIssue,
      argumentLaw,
      args,
      documentDrafts,
      documentArgument,
      documentFact,
      documentIssue,
      documentLaw,
      documents,
      tasks,
      execution,
      aiRecords,
      workspaces,
      timelines,
      knowledge,
      clients,
      workflowEvents,
    ] = await Promise.all([
      tx.matter.count(),
      tx.material.count(),
      tx.evidence.count(),
      tx.factDraft.count(),
      tx.fact.count(),
      tx.issueDraft.count(),
      tx.issue.count(),
      tx.lawDraft.count(),
      tx.lawIssue.count(),
      tx.law.count(),
      tx.argumentDraft.count(),
      tx.argumentFact.count(),
      tx.argumentIssue.count(),
      tx.argumentLaw.count(),
      tx.argument.count(),
      tx.documentDraft.count(),
      tx.documentArgument.count(),
      tx.documentFact.count(),
      tx.documentIssue.count(),
      tx.documentLaw.count(),
      tx.document.count(),
      tx.task.count(),
      tx.executionQueueItem.count(),
      tx.aiRecord.count(),
      tx.workspace.count(),
      tx.timeline.count(),
      tx.knowledge.count(),
      tx.client.count(),
      tx.workflowEvent.count(),
    ])

    return {
      matter,
      materials,
      evidence,
      fact_drafts: factDrafts,
      facts,
      issue_drafts: issueDrafts,
      issues,
      law_drafts: lawDrafts,
      law_issue: lawIssue,
      laws,
      argument_drafts: argumentDrafts,
      argument_fact: argumentFact,
      argument_issue: argumentIssue,
      argument_law: argumentLaw,
      arguments: args,
      document_drafts: documentDrafts,
      document_argument: documentArgument,
      document_fact: documentFact,
      document_issue: documentIssue,
      document_law: documentLaw,
      documents,
      tasks,
      execution,
      ai_records: aiRecords,
      workspaces,
      timelines,
      knowledge,
      clients,
      workflow_events: workflowEvents,
    }
  }
}

export default DevMatterPurgeService
