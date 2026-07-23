import type { CaseIntelligenceInput } from '../types/caseModel.types'

const stringSchema = { type: 'string', minLength: 1 } as const

function strictObject(properties: Record<string, unknown>, required = Object.keys(properties)) {
  return { type: 'object', additionalProperties: false, required, properties }
}

export const DIRECT_MINIMAX_CASE_MODEL_JSON_SCHEMA = strictObject({
  identity: strictObject({
    caseId: stringSchema,
    title: stringSchema,
    caseType: stringSchema,
    stage: stringSchema,
    jurisdiction: stringSchema,
  }),
  narrative: strictObject({
    summary: stringSchema,
    background: stringSchema,
    currentPosture: stringSchema,
  }),
  actors: {
    type: 'array',
    minItems: 1,
    items: strictObject({ id: stringSchema, name: stringSchema, role: stringSchema, position: stringSchema }),
  },
  timeline: {
    type: 'array',
    items: strictObject({
      id: stringSchema,
      date: stringSchema,
      event: stringSchema,
      actorIds: { type: 'array', items: stringSchema },
      certainty: { type: 'string', enum: ['confirmed', 'disputed', 'unknown'] },
    }),
  },
  conflicts: {
    type: 'array',
    items: strictObject({
      id: stringSchema,
      title: stringSchema,
      description: stringSchema,
      actorIds: { type: 'array', items: stringSchema },
    }),
  },
  decisionFactors: {
    type: 'array',
    items: strictObject({
      id: stringSchema,
      label: stringSchema,
      description: stringSchema,
      impact: { type: 'string', enum: ['supportive', 'adverse', 'neutral', 'uncertain'] },
    }),
  },
  risks: {
    type: 'array',
    items: strictObject({
      id: stringSchema,
      description: stringSchema,
      severity: { type: 'string', enum: ['low', 'medium', 'high'] },
      mitigation: stringSchema,
    }),
  },
  unknowns: {
    type: 'array',
    items: strictObject({
      id: stringSchema,
      question: stringSchema,
      importance: { type: 'string', enum: ['low', 'medium', 'high'] },
    }),
  },
  selfReview: strictObject({
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    limitations: { type: 'array', items: stringSchema },
    assumptions: { type: 'array', items: stringSchema },
    requiresLawyerReview: { type: 'boolean', const: true },
  }),
})

export function buildDirectMiniMaxBenchmarkPromptV2(input: CaseIntelligenceInput) {
  return [
    '任务：仅根据 CASE_INPUT 生成一个完整 CaseModel JSON 对象。',
    '输出必须严格通过下方 JSON_SCHEMA；所有 required 字段都必须出现，不得添加任何额外字段。',
    '只输出一个 JSON 对象；不得输出 Markdown 代码块、解释、前缀或后缀。',
    '不得生成 facts、issues、laws 或 documents。不得虚构输入中没有的主体、金额、日期或案件关系。',
    '金额事实约束：必须区分“材料明确金额”“根据材料计算金额”“未知金额”，不得混淆三者。',
    '材料明确金额只能逐项采用 CASE_INPUT 中明确记载的金额，不得改变数值、币种或事实性质。',
    '根据材料计算金额时，必须在相关 narrative 或 decisionFactors 文本中同时保留材料中的原始金额、计算关系和算式，并明确说明该金额是计算结果；不得将计算结果表述为材料直接记载的事实。',
    '涉及还款、付款或其他扣减后的余额计算时，必须先确认扣减项的性质及其与待计算金额的关系均由材料明确；付款性质存在争议时，不得直接扣减并计算剩余本金。',
    '禁止输出未确认性质的付款扣减后的余额或任何推测性的债务余额。应将争议金额及付款性质争议写入 conflicts，将金额不确定性写入 unknowns，并在 decisionFactors 中明确描述“付款性质影响金额计算”。',
    'unknowns 字段禁止输出具体金额计算结果。对于条件性计算，可以描述需要计算及本金、利率、计算期间等计算因素，但禁止输出算式得出的结果金额。',
    'conflicts 和 decisionFactors 同样禁止输出未经确认的具体债务金额；只能说明金额争议、影响金额计算的因素及需要进一步核算的事项。',
    '条件性计算表达示例：禁止写“若30万元为利息，则利息为6万元。”；允许写“若30万元属于利息，需要根据本金、利率及计算期间进一步核算。”',
    '金额计算依据不完整、计算关系不明确或计算结果存在不确定时，不得输出推测数值；必须在 unknowns 中输出对应的 unknown 项，说明待确认的金额及缺失依据。',
    '禁止依据常识、行业惯例、经验比例或 CASE_INPUT 之外的信息推测、补全或反推任何金额。',
    '枚举字段必须逐字使用 Schema 中的英文枚举值，不得使用中文、同义词、重要程度或自然语言句子代替枚举值。',
    'decisionFactors[].impact 只表示方向：明确有利用 supportive，明确不利用 adverse，明确中性用 neutral；只表示重要程度或方向不明时必须用 uncertain。',
    'selfReview.confidence 必须是 0 到 1 之间的 JSON number，不得使用百分比字符串或 high/medium/low。',
    '无法从输入确认的文本字段使用“待确认”；数组没有可靠项时输出 []。actorIds 只能引用 actors 中已声明的 id。',
    `JSON_SCHEMA:\n${JSON.stringify(DIRECT_MINIMAX_CASE_MODEL_JSON_SCHEMA)}`,
    `CASE_INPUT:\n${JSON.stringify(input)}`,
  ].join('\n\n')
}

export default buildDirectMiniMaxBenchmarkPromptV2
