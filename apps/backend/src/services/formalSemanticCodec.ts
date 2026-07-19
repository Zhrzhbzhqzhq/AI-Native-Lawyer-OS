const ARGUMENT_V2_HEADER = 'LAWDESK_FORMAL_ARGUMENT_V2'
const LAW_V2_HEADER = 'LAWDESK_FORMAL_LAW_V2'

export type FormalArgumentSemanticInput = {
  position: string
  reasoning: string
  counter_argument: string
  response: string
  risk: string
}

export type FormalLawSemanticInput = {
  rule_content: string
  application: string
  limitations: string
  jurisdiction: string
  source_reference: string
}

export type FormalSemanticEncoding =
  | 'valid-v2'
  | 'invalid-v2'
  | 'legacy-labeled'
  | 'legacy-plain'
  | 'unsupported-version'
  | 'wrong-object-type'

export type FormalSemanticRecovery = 'complete' | 'partial' | 'unavailable'

type ParsedFormalSemantic<T extends 'argument' | 'law', F> = {
  object_type: T
  version: 2 | null
  encoding: FormalSemanticEncoding
  parsed: boolean
  semantic_recovery: FormalSemanticRecovery
  fields: F
  raw_description: string
  error?: string
}

export type ParsedFormalArgument = ParsedFormalSemantic<'argument', FormalArgumentSemanticInput>
export type ParsedFormalLaw = ParsedFormalSemantic<'law', FormalLawSemanticInput>

const EMPTY_ARGUMENT_FIELDS: FormalArgumentSemanticInput = {
  position: '',
  reasoning: '',
  counter_argument: '',
  response: '',
  risk: '',
}

const EMPTY_LAW_FIELDS: FormalLawSemanticInput = {
  rule_content: '',
  application: '',
  limitations: '',
  jurisdiction: '',
  source_reference: '',
}

const ARGUMENT_LEGACY_LABELS: Record<string, keyof FormalArgumentSemanticInput> = {
  '核心观点': 'position',
  '论证过程': 'reasoning',
  '可能抗辩': 'counter_argument',
  '抗辩回应': 'response',
  '风险与薄弱点': 'risk',
}

const LAW_LEGACY_LABELS: Record<string, keyof FormalLawSemanticInput> = {
  '规则内容': 'rule_content',
  '本案适用说明': 'application',
  '限制与风险': 'limitations',
}

function stringFields<T extends Record<string, string>>(value: unknown, empty: T): T | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const expectedKeys = Object.keys(empty)
  if (Object.keys(record).some((key) => !expectedKeys.includes(key))) return null
  if (expectedKeys.some((key) => !Object.prototype.hasOwnProperty.call(record, key) || typeof record[key] !== 'string')) return null
  return Object.fromEntries(expectedKeys.map((key) => [key, record[key]])) as T
}

function serializeV2<T extends Record<string, string>>(header: string, input: Partial<T>, empty: T) {
  const payload = Object.fromEntries(Object.keys(empty).map((key) => [key, String(input[key] ?? '')]))
  return `${header}\n${JSON.stringify(payload)}`
}

function parseLegacy<T extends Record<string, string>>(
  raw: string,
  labels: Record<string, keyof T>,
  empty: T,
): { fields: T; recovery: FormalSemanticRecovery } | null {
  const labelPattern = Object.keys(labels).map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const matcher = new RegExp(`^(${labelPattern})[：:]`, 'gm')
  const matches = Array.from(raw.matchAll(matcher))
  if (matches.length === 0) return null

  const fields = { ...empty }
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]
    const label = match[1]
    const field = labels[label]
    const start = (match.index || 0) + match[0].length
    const end = index + 1 < matches.length ? (matches[index + 1].index || raw.length) : raw.length
    const content = raw.slice(start, end).trim()
    fields[field] = [fields[field], content].filter(Boolean).join('\n') as T[keyof T]
  }
  const complete = Object.values(fields).every((value) => String(value).length > 0)
  return { fields, recovery: complete ? 'complete' : 'partial' }
}

function headerError(raw: string, expectedHeader: string, wrongHeader: string, objectType: 'argument' | 'law') {
  if (raw.startsWith(wrongHeader)) {
    return { encoding: 'wrong-object-type' as const, error: `expected_${objectType}_semantic_payload` }
  }
  const header = raw.split(/\r?\n/, 1)[0]
  if (header.startsWith(expectedHeader.replace(/V2$/, 'V')) && header !== expectedHeader) {
    return { encoding: 'unsupported-version' as const, error: `unsupported_${objectType}_semantic_version` }
  }
  return null
}

export function serializeFormalArgumentV2(input: FormalArgumentSemanticInput) {
  return serializeV2(ARGUMENT_V2_HEADER, input, EMPTY_ARGUMENT_FIELDS)
}

export function serializeFormalLawV2(input: FormalLawSemanticInput) {
  return serializeV2(LAW_V2_HEADER, input, EMPTY_LAW_FIELDS)
}

export function parseFormalArgument(description: unknown): ParsedFormalArgument {
  const raw = String(description ?? '')
  const base = { object_type: 'argument' as const, raw_description: raw, fields: { ...EMPTY_ARGUMENT_FIELDS } }
  const headerFailure = headerError(raw, ARGUMENT_V2_HEADER, LAW_V2_HEADER, 'argument')
  if (headerFailure) return { ...base, version: null, parsed: false, semantic_recovery: 'unavailable', ...headerFailure }
  if (raw.startsWith(ARGUMENT_V2_HEADER)) {
    if (!raw.startsWith(`${ARGUMENT_V2_HEADER}\n`)) {
      return { ...base, version: 2, encoding: 'invalid-v2', parsed: false, semantic_recovery: 'unavailable', error: 'invalid_argument_v2_separator' }
    }
    try {
      const fields = stringFields(JSON.parse(raw.slice(ARGUMENT_V2_HEADER.length + 1)), EMPTY_ARGUMENT_FIELDS)
      if (!fields) return { ...base, version: 2, encoding: 'invalid-v2', parsed: false, semantic_recovery: 'unavailable', error: 'invalid_argument_v2_fields' }
      return { ...base, version: 2, encoding: 'valid-v2', parsed: true, semantic_recovery: 'complete', fields }
    } catch {
      return { ...base, version: 2, encoding: 'invalid-v2', parsed: false, semantic_recovery: 'unavailable', error: 'invalid_argument_v2_json' }
    }
  }
  const legacy = parseLegacy(raw, ARGUMENT_LEGACY_LABELS, EMPTY_ARGUMENT_FIELDS)
  if (legacy) return { ...base, version: null, encoding: 'legacy-labeled', parsed: true, semantic_recovery: legacy.recovery, fields: legacy.fields }
  return { ...base, version: null, encoding: 'legacy-plain', parsed: false, semantic_recovery: 'unavailable' }
}

export function parseFormalLaw(description: unknown): ParsedFormalLaw {
  const raw = String(description ?? '')
  const base = { object_type: 'law' as const, raw_description: raw, fields: { ...EMPTY_LAW_FIELDS } }
  const headerFailure = headerError(raw, LAW_V2_HEADER, ARGUMENT_V2_HEADER, 'law')
  if (headerFailure) return { ...base, version: null, parsed: false, semantic_recovery: 'unavailable', ...headerFailure }
  if (raw.startsWith(LAW_V2_HEADER)) {
    if (!raw.startsWith(`${LAW_V2_HEADER}\n`)) {
      return { ...base, version: 2, encoding: 'invalid-v2', parsed: false, semantic_recovery: 'unavailable', error: 'invalid_law_v2_separator' }
    }
    try {
      const fields = stringFields(JSON.parse(raw.slice(LAW_V2_HEADER.length + 1)), EMPTY_LAW_FIELDS)
      if (!fields) return { ...base, version: 2, encoding: 'invalid-v2', parsed: false, semantic_recovery: 'unavailable', error: 'invalid_law_v2_fields' }
      return { ...base, version: 2, encoding: 'valid-v2', parsed: true, semantic_recovery: 'complete', fields }
    } catch {
      return { ...base, version: 2, encoding: 'invalid-v2', parsed: false, semantic_recovery: 'unavailable', error: 'invalid_law_v2_json' }
    }
  }
  const legacy = parseLegacy(raw, LAW_LEGACY_LABELS, EMPTY_LAW_FIELDS)
  if (legacy) return { ...base, version: null, encoding: 'legacy-labeled', parsed: true, semantic_recovery: legacy.recovery, fields: legacy.fields }
  return { ...base, version: null, encoding: 'legacy-plain', parsed: false, semantic_recovery: 'unavailable' }
}

export function formatFormalArgumentForDisplay(parsed: ParsedFormalArgument) {
  if (!parsed.parsed) return parsed.encoding === 'legacy-plain' ? parsed.raw_description : '【正式论证语义编码异常，需核验】'
  return [
    parsed.fields.position ? `核心观点：${parsed.fields.position}` : '',
    parsed.fields.reasoning ? `论证过程：${parsed.fields.reasoning}` : '',
    parsed.fields.counter_argument ? `可能抗辩：${parsed.fields.counter_argument}` : '',
    parsed.fields.response ? `抗辩回应：${parsed.fields.response}` : '',
    parsed.fields.risk ? `风险与薄弱点：${parsed.fields.risk}` : '',
  ].filter(Boolean).join('\n')
}

export function formatFormalLawForDisplay(parsed: ParsedFormalLaw) {
  if (!parsed.parsed) return parsed.encoding === 'legacy-plain' ? parsed.raw_description : '【正式法律依据语义编码异常，需核验】'
  return [
    parsed.fields.rule_content ? `规则内容：${parsed.fields.rule_content}` : '',
    parsed.fields.application ? `本案适用说明：${parsed.fields.application}` : '',
    parsed.fields.limitations ? `限制与风险：${parsed.fields.limitations}` : '',
    parsed.fields.jurisdiction ? `适用法域：${parsed.fields.jurisdiction}` : '',
    parsed.fields.source_reference ? `来源参考：${parsed.fields.source_reference}` : '',
  ].filter(Boolean).join('\n')
}

export const FORMAL_ARGUMENT_V2_HEADER = ARGUMENT_V2_HEADER
export const FORMAL_LAW_V2_HEADER = LAW_V2_HEADER
