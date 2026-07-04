import type { PrismaClient } from '@lawdesk/database';

export class MaterialRepository {
  prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByMatterId(matter_id: string) {
    return this.prisma.material.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } });
  }

  async create(data: {
    material_id: string;
    matter_id: string;
    title: string;
    material_type?: string;
    source?: string;
    storage_uri?: string;
    status?: string;
  }) {
    const payload = {
      material_id: data.material_id,
      matter_id: data.matter_id,
      title: data.title,
      material_type: data.material_type ?? '',
      source: data.source ?? '',
      storage_uri: data.storage_uri ?? '',
      status: data.status ?? 'active',
    };
    return this.prisma.material.create({ data: payload as any });
  }

  async deleteByMaterialId(material_id: string) {
    return this.prisma.material.delete({ where: { material_id } });
  }
}

export default MaterialRepository;
