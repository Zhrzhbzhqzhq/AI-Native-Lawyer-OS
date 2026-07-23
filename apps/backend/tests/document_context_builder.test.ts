import { describe, expect, it, vi } from 'vitest'
import DocumentContextBuilder, {
  buildDocumentContext,
  type DocumentContextSourceRows,
} from '../src/services/document_context_builder'
import { serializeFormalArgumentV2, serializeFormalLawV2 } from '../src/services/formalSemanticCodec'

function sourceRows(): DocumentContextSourceRows {
  return {
    matter_id: 'matter-1',
    document_type: 'complaint',
    lawyer_instruction: '仅使用已确认来源',
    matter: { matter_id: 'matter-1', title: '设备采购合同纠纷', description: '双方对合同履行存在争议。' },
    evidences: [
      { evidence_id: 'evidence-1', matter_id: 'matter-1', material_id: 'material-1', title: '设备采购合同', description: '证明合同约定。', status: 'active', material: { material_id: 'material-1', matter_id: 'matter-1', title: '设备采购合同原件', source: 'client', storage_uri: 'storage/intake-uploads/contract.txt' } },
      { evidence_id: 'evidence-other', matter_id: 'matter-2', title: '其他案件证据', description: '', status: 'active', material: null },
    ],
    facts: [
      { fact_id: 'fact-1', matter_id: 'matter-1', title: '双方签订合同', description: '双方签订设备采购合同。', status: 'confirmed' },
      { fact_id: 'fact-rejected', matter_id: 'matter-1', title: '已拒绝事实', description: '', status: 'rejected' },
    ],
    issues: [{ issue_id: 'issue-1', matter_id: 'matter-1', title: '合同履行范围', description: '审查合同履行范围。', status: 'active' }],
    laws: [{
      law_id: 'law-1',
      matter_id: 'matter-1',
      title: '合同履行规则',
      citation: '《中华人民共和国民法典》第五百零九条',
      description: serializeFormalLawV2({
        rule_content: '当事人应当按照约定履行义务。',
        application: '结合已确认事实审查。',
        limitations: '具体适用由律师核验。',
        jurisdiction: '中国大陆',
        source_reference: '正式法源',
      }),
      status: 'published',
    }],
    argumentsList: [{
      argument_id: 'argument-1',
      matter_id: 'matter-1',
      issue_id: 'issue-1',
      title: '应按约履行',
      conclusion: '可依据合同主张履行。',
      description: serializeFormalArgumentV2({
        position: '应按约履行。',
        reasoning: '合同及履行事实支持该主张。',
        counter_argument: '对方可能提出不同解释。',
        response: '以正式材料回应。',
        risk: '原件仍需核对。',
      }),
      status: 'final',
    }],
    factEvidenceLinks: [{ fact_id: 'fact-1', evidence_id: 'evidence-1' }],
    issueFactLinks: [{ issue_id: 'issue-1', fact_id: 'fact-1' }],
    lawIssueLinks: [{ law_id: 'law-1', issue_id: 'issue-1' }],
    argumentFactLinks: [{ argument_id: 'argument-1', fact_id: 'fact-1' }],
    argumentIssueLinks: [{ argument_id: 'argument-1', issue_id: 'issue-1' }],
    argumentLawLinks: [{ argument_id: 'argument-1', law_id: 'law-1' }],
  }
}

describe('DocumentContextBuilder', () => {
  it('preserves the existing relationship-backed document context', async () => {
    const context = await new DocumentContextBuilder().build(sourceRows())

    expect(context.matter).toEqual({
      matter_id: 'matter-1',
      title: '设备采购合同纠纷',
      description: '双方对合同履行存在争议。',
    })
    expect(context.lawyer_instruction).toBe('仅使用已确认来源')
    expect(context.arguments.map((row) => row.argument_id)).toEqual(['argument-1'])
    expect(context.issues.map((row) => row.issue_id)).toEqual(['issue-1'])
    expect(context.facts.map((row) => row.fact_id)).toEqual(['fact-1'])
    expect(context.evidences.map((row) => row.evidence_id)).toEqual(['evidence-1'])
    expect(context.laws.map((row) => row.law_id)).toEqual(['law-1'])
    expect(context.excluded_scopes).toEqual([])
  })

  it('keeps the function API equivalent to the extracted service', async () => {
    const rows = sourceRows()
    const built = await new DocumentContextBuilder(undefined, {
      read: async () => ({ storageUri: 'storage/intake-uploads/contract.txt', content: '合同正文', contentLength: 4 }),
    }).build(rows)
    const pure = buildDocumentContext(rows)

    expect({ ...built, material_sources: [], unavailable_material_sources: [] }).toEqual(pure)
  })

  it('adds the latest completed Case Understanding as positioning context', async () => {
    const understanding = {
      identity: { title: '瑞峰设备采购合同纠纷', caseType: '设备买卖合同纠纷', stage: '诉前', jurisdiction: '中国大陆' },
      narrative: { summary: '双方围绕设备采购履行发生争议。', background: '瑞峰向浩达采购设备。', currentPosture: '待律师确认诉讼请求。' },
      actors: [
        { id: 'actor-1', name: '瑞峰自动化设备有限公司', role: '买方', position: '主张设备履行责任' },
        { id: 'actor-2', name: '浩达精密制造有限公司', role: '卖方', position: '待确认' },
      ],
      timeline: [{ id: 'time-1', date: '2025-01-01', event: '双方签订设备采购合同', actorIds: ['actor-1', 'actor-2'], certainty: 'confirmed' as const }],
      conflicts: [{ id: 'conflict-1', title: '设备履行争议', description: '双方对设备履行情况存在争议。', actorIds: ['actor-1', 'actor-2'] }],
      unknowns: [{ id: 'unknown-1', question: '具体诉讼请求待确认', importance: 'high' as const }],
    }
    const reader = {
      latest: async () => ({ matterId: 'matter-1', status: 'completed', understanding }),
    }

    const context = await new DocumentContextBuilder(reader).build(sourceRows())

    expect(context.case_understanding).toEqual({
      identity: understanding.identity,
      actors: understanding.actors,
      narrative: understanding.narrative,
      conflicts: understanding.conflicts,
      timeline: understanding.timeline,
    })
  })

  it('does not treat Case Understanding narrative or timeline as Formal Facts', async () => {
    const rows = sourceRows()
    rows.caseUnderstanding = {
      identity: { title: '定位信息', caseType: '设备买卖合同纠纷', stage: '诉前', jurisdiction: '中国大陆' },
      narrative: { summary: '仅用于案件定位', background: '不是Formal Fact', currentPosture: '待确认' },
      actors: [{ id: 'actor-1', name: '甲公司', role: '买方', position: '待确认' }],
      timeline: [{ id: 'time-cu', date: '待确认', event: '理解层事件', actorIds: ['actor-1'], certainty: 'unknown' }],
      conflicts: [{ id: 'conflict-1', title: '定位争议', description: '仅用于定位', actorIds: ['actor-1'] }],
    }

    const context = await new DocumentContextBuilder().build(rows)

    expect(context.facts.map((fact) => fact.fact_id)).toEqual(['fact-1'])
    expect(context.facts.some((fact) => fact.description.includes('不是Formal Fact'))).toBe(false)
    expect(context.argument_scopes[0].facts.map((fact) => fact.fact_id)).toEqual(['fact-1'])
  })

  it('rejects Case Understanding returned for a different Matter', async () => {
    const reader = {
      latest: async () => ({
        matterId: 'matter-2',
        status: 'completed',
        understanding: {
          identity: { title: '其他案件', caseType: '民间借贷纠纷', stage: '待确认', jurisdiction: '待确认' },
          narrative: { summary: '其他案件内容', background: '其他案件内容', currentPosture: '待确认' },
          actors: [{ id: 'actor-other', name: '其他主体', role: '出借人', position: '待确认' }],
          timeline: [],
          conflicts: [{ id: 'conflict-other', title: '其他争议', description: '其他案件争议', actorIds: ['actor-other'] }],
          unknowns: [],
        },
      }),
    }

    const context = await new DocumentContextBuilder(reader).build(sourceRows())

    expect(context.case_understanding).toBeNull()
    expect(JSON.stringify(context)).not.toContain('民间借贷纠纷')
  })

  it('reads only Material reachable from the current Argument Scope', async () => {
    const rows = sourceRows()
    rows.evidences.push({
      evidence_id: 'evidence-outside-scope',
      matter_id: 'matter-1',
      material_id: 'material-outside-scope',
      title: 'Scope外证据',
      description: '没有进入当前Argument Scope。',
      status: 'active',
      material: {
        material_id: 'material-outside-scope',
        matter_id: 'matter-1',
        title: 'Scope外材料',
        source: 'client',
        storage_uri: 'storage/intake-uploads/outside.txt',
      },
    })
    const read = vi.fn(async (storageUri: string) => ({
      storageUri,
      content: '设备采购合同完整正文',
      contentLength: 10,
    }))

    const context = await new DocumentContextBuilder(undefined, { read }).build(rows)

    expect(context.material_sources).toEqual([{
      material_id: 'material-1',
      title: '设备采购合同原件',
      source: 'client',
      content: '设备采购合同完整正文',
      contentLength: 10,
    }])
    expect(read).toHaveBeenCalledTimes(1)
    expect(read).toHaveBeenCalledWith('storage/intake-uploads/contract.txt')
    expect(JSON.stringify(context.material_sources)).not.toContain('Scope外材料')
    expect(context.facts.map((fact) => fact.fact_id)).toEqual(['fact-1'])
  })

  it('records an explicit diagnostic when a reachable Material is unreadable', async () => {
    const error = Object.assign(new Error('material_file_unavailable'), { code: 'material_file_unavailable' })
    const context = await new DocumentContextBuilder(undefined, {
      read: async () => { throw error },
    }).build(sourceRows())

    expect(context.material_sources).toEqual([])
    expect(context.unavailable_material_sources).toEqual([{
      material_id: 'material-1',
      title: '设备采购合同原件',
      reason: 'material_file_unavailable',
    }])
    expect(context.facts.map((fact) => fact.fact_id)).toEqual(['fact-1'])
  })
})
