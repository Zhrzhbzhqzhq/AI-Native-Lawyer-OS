import type { PrismaClient } from '@lawdesk/database';
import MaterialRepository from '../repositories/materialRepository';

export class MaterialService {
  repo: MaterialRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new MaterialRepository(prisma);
  }

  listByMatter(matter_id: string) {
    return this.repo.findByMatterId(matter_id);
  }

  createForMatter(matter_id: string, data: { material_id: string; title: string; material_type?: string; source?: string; storage_uri?: string; status?: string }) {
    const payload = { ...data, matter_id } as any;
    return this.repo.create(payload as any);
  }

  deleteByMaterialId(material_id: string) {
    return this.repo.deleteByMaterialId(material_id);
  }
}

export default MaterialService;
