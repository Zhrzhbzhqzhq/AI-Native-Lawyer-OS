import { describe, expect, it, vi } from 'vitest'
import normalizeEvidenceDraftMaterialTitles from '../../src/services/context_engine/evidence_draft_normalizer'
import EvidenceDraftValidator from '../../src/services/context_engine/evidence_draft_validator'
import EvidenceUnderstandingService from '../../src/services/context_engine/evidence_understanding_service'
import type { MinimalContextMaterial } from '../../src/services/context_engine/context_types'

const matterId = 'matter-ruifeng-equipment-sale'
const materials: MinimalContextMaterial[] = [
  { materialId: 'material-contract', title: '03_设备采购合同.pdf', materialType: 'contract', source: 'client', storageUri: 'storage/contract.txt', content: '瑞峰与浩达签订设备采购合同，约定设备型号、价款和交付方式。', contentLength: 30 },
  { materialId: 'material-payment', title: '04_付款记录.pdf', materialType: 'payment_record', source: 'client', storageUri: 'storage/payment.txt', content: '付款记录载明瑞峰按照合同约定向浩达支付部分设备价款。', contentLength: 27 },
  { materialId: 'material-installation', title: '05_安装调试记录.pdf', materialType: 'service_record', source: 'client', storageUri: 'storage/installation.txt', content: '安装调试记录载明浩达人员到场安装设备并记录调试情况。', contentLength: 28 },
]

const understanding = {
  identity: { title: '瑞峰与浩达设备采购纠纷', caseType: '设备买卖合同纠纷', stage: '诉前争议阶段', jurisdiction: '待确认' },
  narrative: { summary: '双方因设备采购合同履行发生争议。', background: '瑞峰向浩达采购自动化设备。', currentPosture: '双方正在核对付款、交付和调试情况。' },
  actors: [
    { id: 'actor-1', name: '瑞峰自动化设备有限公司', role: '买方', position: '要求核对设备履行情况' },
    { id: 'actor-2', name: '浩达精密制造有限公司', role: '卖方', position: '主张已履行部分义务' },
  ],
  timeline: [],
  conflicts: [{ id: 'conflict-1', title: '合同履行争议', description: '双方对付款、交付和调试情况存在争议', actorIds: ['actor-1', 'actor-2'] }],
  unknowns: [],
}

function draft(materialId: string, title: string, proofPurpose: string, importance: 'critical' | 'important' | 'supporting') {
  const material = materials.find((item) => item.materialId === materialId)!
  return {
    draft_id: `draft-${materialId}`,
    material_id: materialId,
    title,
    evidence_type: material.materialType,
    proof_purpose: proofPurpose,
    proof_relationship: '该材料对应设备采购合同履行情况的待证事实',
    importance,
    legal_use: '用于审核设备买卖合同成立及付款、安装调试义务履行情况',
    source_material_ids: [materialId],
    materials: [{ material_id: materialId, title: material.title }],
    summary: '根据材料正文形成的摘要',
    reasoning: '材料正文能够直接支持对应的证明目的',
    confidence: 0.9,
    source: 'client',
    suggested_action: 'confirm_as_evidence',
  }
}

function serviceWithResponse(responseDrafts: unknown[]) {
  const generate = vi.fn(async () => ({ response: { choices: [{ message: { content: JSON.stringify({ evidence_drafts: responseDrafts }) } }] } }))
  const prisma = {
    matter: { findFirst: vi.fn() }, material: { findMany: vi.fn() },
    aiRecord: { create: vi.fn(async ({ data }) => data), update: vi.fn(async ({ data }) => data), updateMany: vi.fn(async () => ({ count: 0 })) },
  }
  const artifactStore = {
    createRun: vi.fn(async (_matterId: string, runId: string) => ({ runId, directory: '/tmp/evidence-v2', inputUri: 'input.json', rawResponseUri: 'raw.json', resultUri: 'result.json' })),
    saveInput: vi.fn(async () => undefined), saveRawResponse: vi.fn(async () => undefined), saveResult: vi.fn(async () => undefined),
  }
  const service = new EvidenceUnderstandingService(prisma as any, {
    caseUnderstandingReader: { latest: vi.fn(async () => ({ aiRecordId: 'understanding-run', matterId, status: 'completed', model: 'MiniMax-M3', generatedAt: '', understanding })) },
    contextBuilder: { build: vi.fn(async () => ({ contextVersion: 'context-engine-c0.1', matterId, generatedAt: '', sourceHash: 'a'.repeat(64), matter: { matterId, title: understanding.identity.title, description: '', matterType: understanding.identity.caseType }, materials, completeness: { complete: true, totalMaterials: 3, readableMaterials: 3, unavailableMaterials: [] } })) },
    generator: { generate }, artifactStore,
  })
  return { service, generate }
}

describe('Evidence Understanding V2', () => {
  it('generates reviewable equipment-sale drafts without private-lending fixture semantics', async () => {
    const expected = [
      draft('material-contract', '设备采购合同', '证明双方签订设备采购合同及合同约定内容', 'critical'),
      draft('material-payment', '付款记录', '证明瑞峰按照设备采购合同支付部分设备价款', 'important'),
      draft('material-installation', '安装调试记录', '证明浩达人员实施设备安装调试工作的情况', 'important'),
    ]
    expected[0].materials[0].title = '设备采购合同来源材料'
    const { service, generate } = serviceWithResponse(expected)

    const result = await service.generate(matterId)

    expect(result.evidence_drafts.map((item) => item.title)).toEqual(['设备采购合同', '付款记录', '安装调试记录'])
    expect(result.evidence_drafts[0].materials).toEqual([{ material_id: 'material-contract', title: '03_设备采购合同.pdf' }])
    expect(result.evidence_drafts[0]).toEqual(expect.objectContaining({
      title: '设备采购合同',
      proof_purpose: '证明双方签订设备采购合同及合同约定内容',
      summary: '根据材料正文形成的摘要',
      reasoning: '材料正文能够直接支持对应的证明目的',
    }))
    expect(JSON.stringify(result)).not.toMatch(/借款合同|借贷合意证据|资金交付证据/)
    expect(generate.mock.calls[0][0].prompt_version).toBe('evidence-understanding-v2')
    expect(generate.mock.calls[0][0].user_prompt).toContain('设备买卖合同纠纷')
    for (const item of result.evidence_drafts) {
      expect(materials.some((material) => material.materialId === item.material_id)).toBe(true)
    }
  })

  it('rejects a private-lending draft that cites another Matter material', () => {
    const invalid = {
      ...draft('material-payment', '借款资金交付证据', '证明借款资金已经交付', 'critical'),
      material_id: 'other-matter-material',
      source_material_ids: ['other-matter-material'],
      materials: [{ material_id: 'other-matter-material', title: '银行流水' }],
    }

    const normalized = normalizeEvidenceDraftMaterialTitles({ evidence_drafts: [invalid] }, materials)
    const validation = new EvidenceDraftValidator().validate(normalized, materials)

    expect(validation.ok).toBe(false)
    if (!validation.ok) expect(validation.errors).toContain('evidence_drafts[0].source_material_not_in_matter')
  })

  it('rejects generic proof purposes and accepts a specific equipment-contract purpose', () => {
    const generic = draft('material-contract', '设备采购合同', '证明案件事实', 'critical')
    const specific = draft('material-contract', '设备采购合同', '证明双方签订设备采购合同及付款约定', 'critical')

    const rejected = new EvidenceDraftValidator().validate({ evidence_drafts: [generic] }, materials)
    const accepted = new EvidenceDraftValidator().validate({ evidence_drafts: [specific] }, materials)

    expect(rejected.ok).toBe(false)
    if (!rejected.ok) expect(rejected.errors).toContain('evidence_drafts[0].proof_purpose_too_generic')
    expect(accepted.ok).toBe(true)
  })
})
