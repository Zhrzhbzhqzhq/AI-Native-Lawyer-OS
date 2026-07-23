type AmountDerivationValidation =
  | { status: 'valid'; expectedYuan: number }
  | { status: 'mismatch'; expectedYuan: number }
  | { status: 'unsupported' }
  | { status: 'not_found' }

type Operand = {
  value: number
  amountRef: string | null
}

const AMOUNT_PATTERN = /\d[\d,]*(?:\.\d+)?\s*(?:元|万元|亿元)/g
const EXPRESSION_PATTERN = /\d[\d,]*(?:\.\d+)?\s*(?:元|万元|亿元)?(?:\s*[+＋\-*×/÷]\s*\d[\d,]*(?:\.\d+)?\s*(?:元|万元|亿元)?)+/g

function amountInYuan(amount: string): number | null {
  const normalized = amount.replace(/\s|,/g, '')
  const match = normalized.match(/^(\d+(?:\.\d+)?)(元|万元|亿元)$/)
  if (!match) return null
  const multiplier = match[2] === '亿元' ? 100_000_000 : match[2] === '万元' ? 10_000 : 1
  return Number(match[1]) * multiplier
}

function explicitAmounts(sourceText: string): Map<number, Set<string>> {
  const result = new Map<number, Set<string>>()
  for (const match of sourceText.matchAll(AMOUNT_PATTERN)) {
    const normalized = match[0].replace(/\s|,/g, '')
    const yuan = amountInYuan(normalized)
    if (yuan === null) continue
    const refs = result.get(yuan) || new Set<string>()
    refs.add(normalized)
    result.set(yuan, refs)
  }
  return result
}

function operandFrom(token: string, sourceAmounts: Map<number, Set<string>>): Operand | null {
  const normalized = token.replace(/\s|,/g, '')
  const currency = normalized.match(/(?:元|万元|亿元)$/)?.[0]
  if (currency) {
    const value = amountInYuan(normalized)
    if (value === null) return null
    return { value, amountRef: sourceAmounts.get(value)?.has(normalized) ? normalized : `!${normalized}` }
  }
  const value = Number(normalized)
  if (!Number.isFinite(value)) return null
  return { value, amountRef: sourceAmounts.has(value) ? `${value}元` : null }
}

function precedence(operator: string): number {
  return ['*', '/', '×', '÷'].includes(operator) ? 2 : 1
}

function apply(left: number, operator: string, right: number): number | null {
  if (operator === '+' || operator === '＋') return left + right
  if (operator === '-') return left - right
  if (operator === '*' || operator === '×') return left * right
  if ((operator === '/' || operator === '÷') && right !== 0) return left / right
  return null
}

function evaluate(expression: string, sourceAmounts: Map<number, Set<string>>): {
  value: number
  grounded: boolean
} | null {
  const tokens = expression.match(/\d[\d,]*(?:\.\d+)?\s*(?:元|万元|亿元)?|[+＋\-*×/÷]/g)
  if (!tokens || tokens.length < 3) return null
  const values: number[] = []
  const operators: string[] = []
  let grounded = false

  const reduce = (): boolean => {
    const right = values.pop()
    const left = values.pop()
    const operator = operators.pop()
    if (left === undefined || right === undefined || !operator) return false
    const result = apply(left, operator, right)
    if (result === null || !Number.isFinite(result)) return false
    values.push(result)
    return true
  }

  for (let index = 0; index < tokens.length; index += 1) {
    if (index % 2 === 0) {
      const operand = operandFrom(tokens[index], sourceAmounts)
      if (!operand || operand.amountRef?.startsWith('!')) return null
      grounded ||= operand.amountRef !== null
      values.push(operand.value)
    } else {
      const operator = tokens[index]
      while (operators.length > 0
        && precedence(operators[operators.length - 1]) >= precedence(operator)) {
        if (!reduce()) return null
      }
      operators.push(operator)
    }
  }
  while (operators.length > 0) if (!reduce()) return null
  return values.length === 1 ? { value: values[0], grounded } : null
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings)
  return []
}

export class AmountDerivationValidator {
  validate(outputAmount: string, model: unknown, sourceText: string): AmountDerivationValidation {
    const outputYuan = amountInYuan(outputAmount)
    if (outputYuan === null) return { status: 'unsupported' }
    const sourceAmounts = explicitAmounts(sourceText)
    let foundExpression = false
    let mismatch: number | undefined

    for (const text of collectStrings(model)) {
      if (!text.includes(outputAmount)) continue
      for (const match of text.matchAll(EXPRESSION_PATTERN)) {
        foundExpression = true
        const result = evaluate(match[0], sourceAmounts)
        if (!result?.grounded) continue
        if (Math.abs(result.value - outputYuan) < 0.000001) {
          return { status: 'valid', expectedYuan: result.value }
        }
        mismatch = result.value
      }
    }

    if (mismatch !== undefined) return { status: 'mismatch', expectedYuan: mismatch }
    return foundExpression ? { status: 'unsupported' } : { status: 'not_found' }
  }
}

export default AmountDerivationValidator
