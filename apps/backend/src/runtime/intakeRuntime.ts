import type { AIAudit } from '../services/ai/aiAudit'
import { createAIAudit } from '../services/ai/aiAudit'

export type IntakeSource = 'Plaintiff' | 'Opponent' | 'Court' | 'Third Party'

export type IntakeFileMeta = {
  name: string
  size?: number
  type?: string
  content?: string
  storage_uri?: string
}

export type IntakeRuntimeInput = {
  job_id: string
  matter_id: string | null
  source: IntakeSource
  files: IntakeFileMeta[]
}

export type IntakeRuntimeResult = {
  job_id: string
  matter_id: string | null
  source: IntakeSource
  files: IntakeFileMeta[]
  status: 'analysis_ready'
  ai_audit: AIAudit
  analysis: {
    summary: string
    matter_draft: {
      title: string
      client: string
      opponent: string
      matter_type: string
      confidence?: {
        title?: number
        client?: number
        opponent?: number
        matter_type?: number
      }
    }
    detected_matter: {
      matter_id: string | null
      confidence: number
      reason: string
    }
    material_suggestions: unknown[]
    evidence_suggestions: unknown[]
    document_suggestions: unknown[]
    next_actions: unknown[]
  }
}

export class IntakeRuntime {
  static readonly PIPELINE = [
    'Upload',
    'OCR',
    'Speech To Text',
    'Matter Detection',
    'Classification',
    'Evidence Suggestion',
    'Document Suggestion',
  ] as const

  extractMatterDraft(files: IntakeFileMeta[]) {
    const text = files
      .map((file) => [file.name, file.type, file.content].filter(Boolean).join('\n'))
      .join('\n\n')

    const hasContent = files.some((file) => String(file.content || '').trim().length > 0)
    const client = this.firstMatch(text, [
      /(?:委托人|出借人|原告|咨询人)(?:为|是|：|:|\s)*([\u4e00-\u9fa5]{2,8})/,
      /([\u4e00-\u9fa5]{2,8})(?:拟提起|到所咨询|提交|称，其与)/,
    ])
    const opponent = this.firstMatch(text, [
      /(?:对方当事人|借款人|被告)(?:为|是|：|:|\s)*([\u4e00-\u9fa5]{2,8})/,
      /(?:向|要求)([\u4e00-\u9fa5]{2,8})(?:偿还|支付|归还)/,
      /([\u4e00-\u9fa5]{2,8})(?:以经营|因经营|同日向|签收后|未再还款|承认欠款)/,
    ])
    const matterType = /民间借贷/.test(text)
      ? '民间借贷纠纷'
      : /劳动争议/.test(text)
        ? '劳动争议'
        : /离婚/.test(text)
          ? '婚姻家事'
          : /合同/.test(text)
            ? '合同纠纷'
            : ''

    const title = client && opponent && matterType
      ? `${client}诉${opponent}${matterType}${matterType.endsWith('纠纷') ? '' : '纠纷'}`
      : ''

    const baseConfidence = hasContent ? 0.9 : 0.2
    return {
      title,
      client,
      opponent,
      matter_type: matterType,
      confidence: {
        title: title ? baseConfidence : 0,
        client: client ? baseConfidence : 0,
        opponent: opponent ? baseConfidence : 0,
        matter_type: matterType ? baseConfidence : 0,
      },
    }
  }

  private firstMatch(text: string, patterns: RegExp[]) {
    for (const pattern of patterns) {
      const found = text.match(pattern)
      const value = this.cleanPartyName(found?.[1])
      if (value) return value
    }
    return ''
  }

  private cleanPartyName(value: string | undefined) {
    return String(value || '')
      .trim()
      .replace(/^[为是]/, '')
      .replace(/[称因今拟]$/, '')
      .replace(/[，。；;：:]$/, '')
      .trim()
  }

  run(input: IntakeRuntimeInput): IntakeRuntimeResult {
    const internalSource = (() => {
      const s = String(input.source || '')
      if (s === 'Plaintiff') return 'client'
      if (s === 'Opponent') return 'opponent'
      if (s === 'Court') return 'court'
      return 'third_party'
    })()

    const nextActions: string[] = (() => {
      if (internalSource === 'client') return ['confirm_material', 'generate_evidence_draft']
      if (internalSource === 'opponent') return ['confirm_material', 'generate_opponent_evidence_draft', 'prepare_challenge_opinion_draft']
      if (internalSource === 'court') return ['confirm_material', 'review_court_notice']
      return ['confirm_material', 'classify_third_party_material']
    })()
    const matterDraft = this.extractMatterDraft(input.files)

    return {
      job_id: input.job_id,
      status: 'analysis_ready',
      matter_id: input.matter_id,
      source: (() => {
        const s = String(input.source || '')
        if (s === 'Plaintiff') return 'Plaintiff'
        if (s === 'Opponent') return 'Opponent'
        if (s === 'Court') return 'Court'
        return 'Third Party'
      })(),
      files: input.files,
      ai_audit: createAIAudit('runtime', 'lawdesk-intake-runtime-v1', 'intake-runtime-v1'),
      analysis: {
        summary: `已接收 ${input.files.length} 份材料，完成案件基础信息抽取。`,
        matter_draft: matterDraft,
        detected_matter: {
          matter_id: input.matter_id || null,
          confidence: 0.8,
          reason: input.matter_id ? 'Found matching matter id in filename/metadata' : 'No matter id provided',
        },
        material_suggestions: [],
        evidence_suggestions: [],
        document_suggestions: [],
        next_actions: nextActions,
      },
    }
  }

  generateEvidenceDrafts(input: { matter_id: string; materials: Array<{ material_id: string; title?: string; material_type?: string; source?: string; content?: string; storage_uri?: string }>}): {
    status: 'evidence_draft_ready'
    matter_id: string
    ai_audit: AIAudit
    evidence_drafts: Array<{
      draft_id: string
      material_id: string
      title: string
      evidence_type: string
      proof_purpose: string
      source_material_ids: string[]
      materials: Array<{ material_id: string; title: string }>
      summary: string
      reasoning: string
      confidence: number
      source: 'client' | 'opponent' | 'court' | 'third_party'
      suggested_action: 'confirm_as_evidence'
    }>
  } {
    type EvidenceGroup = {
      key: 'agreement' | 'delivery' | 'default'
      title: string
      proof_purpose: string
      summary: string
      reasoning: string
      keywords: string[]
      titleKeywords: string[]
      supportTitleKeywords: string[]
      confidenceBase: number
    }

    const groups: EvidenceGroup[] = [
      {
        key: 'agreement',
        title: '借贷合意证据',
        proof_purpose: '证明双方达成民间借贷合意并明确借款基础事实',
        summary: '借条、聊天、咨询或录音材料相互印证双方围绕借款金额、用途、期限等事项形成合意。',
        reasoning: '该组材料共同指向借款关系成立：一类材料反映当事人陈述，另一类材料反映书面或沟通记录，可相互校验借贷合意。',
        keywords: ['借款合意', '民间借贷', '借条', '出借', '借款人', '出借人', '借款', '约定', '借给', '收到借款', '借款形成'],
        titleKeywords: ['客户咨询', '咨询录音', '借款形成', '借条'],
        supportTitleKeywords: [],
        confidenceBase: 0.84,
      },
      {
        key: 'delivery',
        title: '借款资金交付证据',
        proof_purpose: '证明出借人已实际支付借款并完成资金交付',
        summary: '银行流水、转账记录与借条或当事人陈述可以共同证明借款款项已经实际交付。',
        reasoning: '资金交付需要客观支付记录与借贷背景材料相互印证；流水或转账记录证明款项流转，借条或咨询记录说明该笔款项性质。',
        keywords: ['银行流水', '转账', '汇款', '支付', '到账', '收款', '交付', '流水', '银行', '款项'],
        titleKeywords: ['银行流水', '转账', '汇款', '支付'],
        supportTitleKeywords: ['借条', '客户咨询'],
        confidenceBase: 0.86,
      },
      {
        key: 'default',
        title: '到期未还与催收证据',
        proof_purpose: '证明债务已到期且借款人未按约履行还款义务',
        summary: '催收聊天、电话记录、律师函或到期约定材料可以共同证明债务到期后的催收和未还事实。',
        reasoning: '到期未还需要还款期限、催收行为和对方未履行情况形成链条；沟通记录与律师函等材料可相互补强持续催收事实。',
        keywords: ['到期', '还款', '未还', '未归还', '催收', '律师函', '电话', '逾期', '归还', '欠款', '履行'],
        titleKeywords: ['催收', '电话', '律师函'],
        supportTitleKeywords: ['银行流水', '借条'],
        confidenceBase: 0.82,
      },
    ]

    const normalizedMaterials = input.materials
      .map((m) => ({
        material_id: String(m.material_id || ''),
        title: String(m.title || '未命名材料'),
        material_type: String(m.material_type || 'document'),
        source: String(m.source || ''),
        text: [m.title, m.material_type, m.storage_uri, m.content].filter(Boolean).join('\n'),
      }))
      .filter((m) => m.material_id)

    const source = ((): any => {
      const found = normalizedMaterials.map((m) => m.source).find((s) => ['client', 'opponent', 'court', 'third_party'].includes(s))
      return found || 'client'
    })()

    const drafts = groups.flatMap((group, idx) => {
      const directMatches = normalizedMaterials.filter((material) => {
        if (group.titleKeywords.some((keyword) => material.title.includes(keyword))) return true
        const keywordHits = group.keywords.filter((keyword) => material.text.includes(keyword)).length
        return keywordHits >= 3 && !groups.some((other) => other !== group && other.titleKeywords.some((keyword) => material.title.includes(keyword)))
      })
      const supportingMatches = normalizedMaterials.filter((material) => group.supportTitleKeywords.some((keyword) => material.title.includes(keyword)))

      const materialMap = new Map<string, typeof normalizedMaterials[number]>()
      for (const material of [...directMatches, ...supportingMatches]) materialMap.set(material.material_id, material)
      const materials = Array.from(materialMap.values())

      if (materials.length === 0) return []

      const directCount = new Set(directMatches.map((m) => m.material_id)).size
      const confidence = Math.min(0.95, Math.max(0.55, group.confidenceBase + Math.min(0.08, (materials.length - 1) * 0.03) + (directCount > 1 ? 0.03 : 0)))

      return [{
        draft_id: `ed-${Date.now().toString(36)}-${idx}`,
        material_id: materials[0].material_id,
        title: group.title,
        evidence_type: materials.some((m) => m.material_type) ? materials[0].material_type : 'document',
        proof_purpose: group.proof_purpose,
        source_material_ids: materials.map((m) => m.material_id),
        materials: materials.map((m) => ({ material_id: m.material_id, title: m.title })),
        summary: `${group.summary} 来源材料：${materials.map((m) => m.title).join('、')}。`,
        reasoning: group.reasoning,
        confidence,
        source,
        suggested_action: 'confirm_as_evidence' as const,
      }]
    })

    return {
      status: 'evidence_draft_ready',
      matter_id: input.matter_id,
      ai_audit: createAIAudit('runtime', 'lawdesk-intake-runtime-v1', 'evidence-draft-v1'),
      evidence_drafts: drafts,
    }
  }

  generateChallengeDrafts(input: { matter_id: string; evidence_drafts: Array<{ draft_id: string; material_id: string; title?: string; evidence_type?: string; proof_purpose?: string; source?: string; suggested_action?: string }> }) {
    const drafts = input.evidence_drafts
      .filter((d) => String(d.source || '') === 'opponent')
      .map((d, idx) => ({
        draft_id: `cd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${idx}`,
        evidence_draft_id: d.draft_id,
        title: d.title || 'untitled',
        challenge_points: {
          authenticity: '存在真实性可疑点（例如来源、签名、元数据）',
          legality: '存在合法性疑点（例如非法取得、程序瑕疵）',
          relevance: '关联性需进一步论证（与主张的事实链路）',
          probative_force: '证明力受限（证据证明力不足或可被反驳）',
        },
        suggested_opinion: `建议对该证据的来源与真实性提出质疑，并准备证据补充或反驳方向（基于 material_id=${d.material_id}）`,
        confidence: 0.8,
        requires_lawyer_confirmation: true,
      }))

    return {
      status: 'challenge_draft_ready',
      matter_id: input.matter_id,
      challenge_opinion_drafts: drafts,
    }
  }

  generateDocumentUpdateSuggestions(input: { matter_id: string; trigger: { type: 'evidence_created' | 'challenge_document_created'; id: string; title?: string } }) {
    const suggestions: Array<{
      suggestion_id: string
      target_document_type: 'complaint' | 'defense' | 'representation' | 'evidence_catalog' | 'hearing_outline' | 'challenge_opinion'
      target_title: string
      reason: string
      suggested_change_summary: string
      requires_lawyer_confirmation: boolean
    }> = []

    const trig = input.trigger
    const nowId = Date.now().toString(36)

    if (trig.type === 'evidence_created') {
      // at least suggest evidence_catalog, representation, hearing_outline
      suggestions.push({
        suggestion_id: `s-${nowId}-ec`,
        target_document_type: 'evidence_catalog',
        target_title: 'Evidence Catalog (建议更新)',
        reason: `新证据 ${trig.id} (${trig.title || ''}) 已加入，需更新证据目录以便检索。`,
        suggested_change_summary: `将证据 ${trig.id} 添加至证据目录，并补充证明事实的关联说明。`,
        requires_lawyer_confirmation: true,
      })
      suggestions.push({
        suggestion_id: `s-${nowId}-rep`,
        target_document_type: 'representation',
        target_title: 'Representation / 代理词 (建议更新)',
        reason: `新增证据可能影响代理词的论点与证据链，应审阅并调整论证要点。`,
        suggested_change_summary: `基于新增证据 ${trig.id}，建议补充或调整关键事实与引用证据编号。`,
        requires_lawyer_confirmation: true,
      })
      suggestions.push({
        suggestion_id: `s-${nowId}-ho`,
        target_document_type: 'hearing_outline',
        target_title: 'Hearing Outline (建议更新)',
        reason: `新增证据可能影响庭审陈述顺序与要点，应更新庭审提纲。`,
        suggested_change_summary: `将证据 ${trig.id} 安排在庭审提纲中合适的位置，并准备可能的质证问题。`,
        requires_lawyer_confirmation: true,
      })
    }

    if (trig.type === 'challenge_document_created') {
      // at least suggest representation and hearing_outline
      suggestions.push({
        suggestion_id: `s-${nowId}-rep-c`,
        target_document_type: 'representation',
        target_title: 'Representation / 代理词 (建议更新)',
        reason: `质证意见文书 ${trig.id} 已生成，代理词可能需依据该文书调整反驳或支持策略。`,
        suggested_change_summary: `审阅质证意见 ${trig.id} 并在代理词中补充反驳要点及证据链。`,
        requires_lawyer_confirmation: true,
      })
      suggestions.push({
        suggestion_id: `s-${nowId}-ho-c`,
        target_document_type: 'hearing_outline',
        target_title: 'Hearing Outline (建议更新)',
        reason: `针对新生成的质证意见，应调整庭审提纲以应对可能的争点。`,
        suggested_change_summary: `将质证意见 ${trig.id} 的要点整合进庭审提纲，并标注需要准备的质证材料。`,
        requires_lawyer_confirmation: true,
      })
    }

    return {
      status: 'document_update_suggestions_ready',
      matter_id: input.matter_id,
      trigger: input.trigger,
      document_update_suggestions: suggestions,
    }
  }
}

export default IntakeRuntime
