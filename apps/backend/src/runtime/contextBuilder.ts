import type { PrismaClient } from '@lawdesk/database';
import ObjectGraphBuilder from './objectGraphBuilder';
import type { MatterObjectGraph } from './objectGraph';

export type Task = any;
export type Evidence = any;
export type Conversation = any;
export type Timeline = any;
export type Document = any;

export interface MatterContext {
  graph: MatterObjectGraph;
  summary: string;
  activeTasks: Task[];
  keyEvidence: Evidence[];
  latestConversation: Conversation[];
  recentTimeline: Timeline[];
  pendingDocuments: Document[];
}

export class ContextBuilder {
  objectGraphBuilder: ObjectGraphBuilder;

  constructor(prisma: PrismaClient) {
    this.objectGraphBuilder = new ObjectGraphBuilder(prisma);
  }

  async build(matterId: string): Promise<MatterContext> {
    const graph = await this.objectGraphBuilder.build(matterId);

    const recentTimeline = [...graph.timeline]
      .sort((a: any, b: any) => {
        const aTime = a?.created_at || a?.event_time;
        const bTime = b?.created_at || b?.event_time;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      })
      .slice(0, 10);

    const activeTasks = graph.tasks.filter((task: any) => !['completed', 'done', 'closed'].includes(String(task?.status || '').toLowerCase()));

    const keyEvidence = [...graph.evidence];

    const latestConversation = [...graph.conversations]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);

    const pendingDocuments = graph.documents.filter((doc: any) => !['completed', 'final', 'archived'].includes(String(doc?.status || '').toLowerCase()));

    const summary = `Matter ${graph.matter.matter_id}: ${graph.matter.title}`;

    // Provide both a structured object graph and top-level fields expected by
    // the runtime APIs (matter, timeline, evidence, research, documents, tasks, summary).
    return {
      graph,
      summary,
      activeTasks,
      keyEvidence,
      latestConversation,
      recentTimeline,
      pendingDocuments,
      // Top-level compatibility keys
      matter: graph.matter,
      timeline: recentTimeline,
      evidence: keyEvidence,
      research: graph.research,
      documents: graph.documents,
      tasks: graph.tasks,
    } as any;
  }
}

export default ContextBuilder;