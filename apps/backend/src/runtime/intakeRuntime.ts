export type IntakeSource = 'Plaintiff' | 'Opponent' | 'Court' | 'Third Party'

export type IntakeFileMeta = {
  name: string
  size?: number
  type?: string
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
  analysis: {
    summary: string
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
      analysis: {
        summary: `Mock analysis for ${input.job_id}: ${input.files.length} files detected.`,
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

  generateEvidenceDrafts(input: { matter_id: string; materials: Array<{ material_id: string; title?: string; material_type?: string; source?: string }>}): {
    status: 'evidence_draft_ready'
    matter_id: string
    evidence_drafts: Array<{
      draft_id: string
      material_id: string
      title: string
      evidence_type: string
      proof_purpose: string
      confidence: number
      source: 'client' | 'opponent' | 'court' | 'third_party'
      suggested_action: 'confirm_as_evidence'
    }>
  } {
    const drafts = input.materials.map((m, idx) => ({
      draft_id: `ed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${idx}`,
      material_id: m.material_id,
      title: m.title || 'untitled',
      evidence_type: m.material_type || 'document',
      proof_purpose: 'Support claim',
      confidence: 0.8,
      source: ((): any => {
        const s = String(m.source || '')
        if (s === 'client') return 'client'
        if (s === 'opponent') return 'opponent'
        if (s === 'court') return 'court'
        return 'third_party'
      })(),
      suggested_action: ((): any => {
        const s = String(m.source || '')
        if (s === 'opponent') return 'prepare_challenge_opinion'
        return 'confirm_as_evidence'
      })(),
    }))

    return {
      status: 'evidence_draft_ready',
      matter_id: input.matter_id,
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
}

export default IntakeRuntime