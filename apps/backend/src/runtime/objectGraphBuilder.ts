import type { PrismaClient } from '@lawdesk/database';
import MatterRepository from '../repositories/matterRepository';
import TimelineRepository from '../repositories/timelineRepository';
import MaterialRepository from '../repositories/materialRepository';
import EvidenceRepository from '../repositories/evidenceRepository';
import ResearchRepository from '../repositories/researchRepository';
import DocumentRepository from '../repositories/documentRepository';
import TaskRepository from '../repositories/taskRepository';
import ConversationRepository from '../repositories/conversationRepository';
import type { MatterObjectGraph } from './objectGraph';

export class ObjectGraphBuilder {
  matterRepository: MatterRepository;
  timelineRepository: TimelineRepository;
  materialRepository: MaterialRepository;
  evidenceRepository: EvidenceRepository;
  researchRepository: ResearchRepository;
  documentRepository: DocumentRepository;
  taskRepository: TaskRepository;
  conversationRepository: ConversationRepository;

  constructor(prisma: PrismaClient) {
    this.matterRepository = new MatterRepository(prisma);
    this.timelineRepository = new TimelineRepository(prisma);
    this.materialRepository = new MaterialRepository(prisma);
    this.evidenceRepository = new EvidenceRepository(prisma);
    this.researchRepository = new ResearchRepository(prisma);
    this.documentRepository = new DocumentRepository(prisma);
    this.taskRepository = new TaskRepository(prisma);
    this.conversationRepository = new ConversationRepository(prisma);
  }

  async build(matterId: string): Promise<MatterObjectGraph> {
    const [
      matter,
      timeline,
      materials,
      evidence,
      research,
      documents,
      tasks,
      conversations,
    ] = await Promise.all([
      this.matterRepository.findByMatterId(matterId),
      this.timelineRepository.findByMatterId(matterId),
      this.materialRepository.findByMatterId(matterId),
      this.evidenceRepository.findByMatterId(matterId),
      this.researchRepository.findByMatterId(matterId),
      this.documentRepository.findByMatterId(matterId),
      this.taskRepository.findByMatterId(matterId),
      this.conversationRepository.findByMatterId(matterId),
    ]);

    if (!matter) {
      throw new Error('Matter not found');
    }

    return {
      matter,
      timeline,
      materials,
      evidence,
      research,
      documents,
      tasks,
      conversations,
    };
  }
}

export default ObjectGraphBuilder;