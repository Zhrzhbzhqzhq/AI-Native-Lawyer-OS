import type { PrismaClient } from '@lawdesk/database'
import ProviderManager from '../../ai/providerManager'

export class AIService {
    prisma: PrismaClient
    adapter: any

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
        this.adapter = ProviderManager.getAdapter()
    }

    // analyzeEvidence: reads materials under the matter and asks the adapter
    // to identify candidate evidence items. Returns an array of suggestions.
    async analyzeEvidence(matter_id: string) {
        // fetch materials
        const materials = await this.prisma.material.findMany({ where: { matter_id }, orderBy: { created_at: 'desc' } as any })

        // build a simple promptPack for adapter
        const promptPack = {
            task: 'analyze_evidence',
            matter_id,
            materials: materials.map((m: any) => ({ title: m.title || '', description: m.description || '', ocr: m.ocr_text || '', text: m.content || m.text || '', material_type: m.material_type || '' })),
            created_at: new Date().toISOString(),
        }

        try {
            const resp = await this.adapter.generate(promptPack)
            // adapter may return structured suggestions under resp.response.suggestions
            const suggestions = (resp && resp.response && Array.isArray(resp.response.suggestions)) ? resp.response.suggestions : null
            if (Array.isArray(suggestions)) {
                // normalize suggestions to expected shape
                return suggestions.map((s: any) => ({ title: String(s.title || s.name || ''), reason: String(s.reason || s.description || ''), evidence_type: String(s.evidence_type || s.type || '') }))
            }
        } catch (e) {
            // fall through to material-derived suggestions
            // console.error('ai adapter failed', e)
        }

        // fallback: turn materials into suggestions
        const fallback = materials.slice(0, 5).map((m: any) => ({ title: m.title || '未命名材料', reason: m.description || (m.storage_uri ? `来自 ${m.storage_uri}` : '材料可能包含有力证据'), evidence_type: m.material_type || '文书' }))
        return fallback
    }
}

export default AIService
