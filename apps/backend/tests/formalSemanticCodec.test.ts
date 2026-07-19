import { describe, expect, it } from 'vitest'
import {
  FORMAL_ARGUMENT_V2_HEADER,
  FORMAL_LAW_V2_HEADER,
  formatFormalArgumentForDisplay,
  parseFormalArgument,
  parseFormalLaw,
  serializeFormalArgumentV2,
  serializeFormalLawV2,
} from '../src/services/formalSemanticCodec'
import ArgumentService from '../src/services/argumentService'
import LawService from '../src/services/lawService'

describe('M155 Formal Semantic Codec', () => {
  it('round-trips every Argument field including labels and special characters', () => {
    const fields = {
      position: '第一行\n核心观点：正文中的标签',
      reasoning: '包含“引号”、\\反斜杠与\n换行',
      counter_argument: '可能抗辩：仅为字段正文',
      response: '逐项回应',
      risk: '',
    }
    const encoded = serializeFormalArgumentV2(fields)
    expect(encoded.startsWith(`${FORMAL_ARGUMENT_V2_HEADER}\n`)).toBe(true)
    expect(parseFormalArgument(encoded)).toMatchObject({ encoding: 'valid-v2', parsed: true, semantic_recovery: 'complete', fields })
  })

  it('round-trips every Law field including jurisdiction and source_reference', () => {
    const fields = {
      rule_content: '规则第一行\n规则第二行',
      application: '包含：中文冒号与"引号"',
      limitations: '',
      jurisdiction: '中华人民共和国大陆地区',
      source_reference: '律师核验来源\\2026',
    }
    const encoded = serializeFormalLawV2(fields)
    expect(encoded.startsWith(`${FORMAL_LAW_V2_HEADER}\n`)).toBe(true)
    expect(parseFormalLaw(encoded)).toMatchObject({ encoding: 'valid-v2', parsed: true, semantic_recovery: 'complete', fields })
  })

  it('does not downgrade malformed, incomplete, wrong-type or unsupported V2 data', () => {
    expect(parseFormalArgument(`${FORMAL_ARGUMENT_V2_HEADER}\n{bad`)).toMatchObject({ encoding: 'invalid-v2', parsed: false, error: 'invalid_argument_v2_json' })
    expect(parseFormalArgument(`${FORMAL_ARGUMENT_V2_HEADER}\n{"position":"x"}`)).toMatchObject({ encoding: 'invalid-v2', parsed: false, error: 'invalid_argument_v2_fields' })
    expect(parseFormalArgument(`${FORMAL_LAW_V2_HEADER}\n{}`)).toMatchObject({ encoding: 'wrong-object-type', parsed: false })
    expect(parseFormalArgument('LAWDESK_FORMAL_ARGUMENT_V3\n{}')).toMatchObject({ encoding: 'unsupported-version', parsed: false })
    expect(parseFormalLaw(`${FORMAL_ARGUMENT_V2_HEADER}\n{}`)).toMatchObject({ encoding: 'wrong-object-type', parsed: false })
  })

  it('parses multiline legacy Argument fields and marks missing fields partial', () => {
    const raw = [
      '核心观点：本方观点第一行',
      '第二行含有可能抗辩：但不在行首',
      '论证过程：论证第一行',
      '论证第二行',
      '抗辩回应：回应内容',
    ].join('\n')
    const parsed = parseFormalArgument(raw)
    expect(parsed).toMatchObject({ encoding: 'legacy-labeled', parsed: true, semantic_recovery: 'partial' })
    expect(parsed.fields.position).toContain('第二行含有可能抗辩：但不在行首')
    expect(parsed.fields.reasoning).toBe('论证第一行\n论证第二行')
    expect(parsed.fields.counter_argument).toBe('')
    expect(parsed.raw_description).toBe(raw)
    expect(formatFormalArgumentForDisplay(parsed)).toContain('核心观点：本方观点第一行')
  })

  it('parses legacy Law fields without inventing unavailable metadata', () => {
    const raw = '规则内容：规则内容\n本案适用说明：适用说明'
    const parsed = parseFormalLaw(raw)
    expect(parsed).toMatchObject({ encoding: 'legacy-labeled', parsed: true, semantic_recovery: 'partial' })
    expect(parsed.fields).toEqual({
      rule_content: '规则内容',
      application: '适用说明',
      limitations: '',
      jurisdiction: '',
      source_reference: '',
    })
  })

  it('keeps unlabeled legacy descriptions raw without semantic guessing', () => {
    const argument = parseFormalArgument('一段无法分层的旧论证。')
    const law = parseFormalLaw('一段无法分层的旧法律说明。')
    expect(argument).toMatchObject({ encoding: 'legacy-plain', parsed: false, semantic_recovery: 'unavailable' })
    expect(argument.fields).toEqual({ position: '', reasoning: '', counter_argument: '', response: '', risk: '' })
    expect(law).toMatchObject({ encoding: 'legacy-plain', parsed: false, semantic_recovery: 'unavailable' })
    expect(law.fields).toEqual({ rule_content: '', application: '', limitations: '', jurisdiction: '', source_reference: '' })
  })

  it('formats V2 descriptions at the backend presentation boundary', async () => {
    const argumentDescription = serializeFormalArgumentV2({
      position: '正式观点', reasoning: '正式论证', counter_argument: '可能抗辩', response: '正式回应', risk: '内部风险',
    })
    const lawDescription = serializeFormalLawV2({
      rule_content: '正式规则', application: '适用说明', limitations: '适用限制', jurisdiction: '适用法域', source_reference: '核验来源',
    })
    const argumentService = new ArgumentService({ argument: { findMany: async () => [{ argument_id: 'a-1', description: argumentDescription }] } } as any)
    const lawService = new LawService({ law: { findMany: async () => [{ law_id: 'l-1', description: lawDescription }] } } as any)

    const [argument] = await argumentService.listArguments('matter-1')
    const [law] = await lawService.listLaws('matter-1')
    expect(argument.description).toContain('核心观点：正式观点')
    expect(argument.description).not.toContain(FORMAL_ARGUMENT_V2_HEADER)
    expect(law.description).toContain('规则内容：正式规则')
    expect(law.description).toContain('适用法域：适用法域')
    expect(law.description).not.toContain(FORMAL_LAW_V2_HEADER)
  })
})
