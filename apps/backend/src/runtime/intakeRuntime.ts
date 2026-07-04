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
        next_actions: [],
      },
    }
  }
}

export default IntakeRuntime