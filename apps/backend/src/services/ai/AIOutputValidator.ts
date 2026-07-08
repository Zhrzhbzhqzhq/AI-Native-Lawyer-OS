export type ValidationResult = {
    ok: boolean
    errors: string[]
}

function isNonEmptyString(v: any) {
    return typeof v === 'string' && v.trim().length > 0
}

export function validateFacts(result: any): ValidationResult {
    const errors: string[] = []
    if (!Array.isArray(result)) {
        return { ok: false, errors: ['facts must be an array'] }
    }
    const allowed = new Set(['confirmed', 'to_prove', 'disputed'])
    result.forEach((f: any, idx: number) => {
        if (!f || typeof f !== 'object') {
            errors.push(`fact[${idx}] must be an object`)
            return
        }
        if (!isNonEmptyString(f.title)) errors.push(`fact[${idx}].title missing or empty`)
        if (!isNonEmptyString(f.description)) errors.push(`fact[${idx}].description missing or empty`)
        if (!isNonEmptyString(f.category)) errors.push(`fact[${idx}].category missing or empty`)
        else if (!allowed.has(f.category)) errors.push(`fact[${idx}].category must be one of: confirmed,to_prove,disputed`)
        if (!Array.isArray(f.evidence_titles)) errors.push(`fact[${idx}].evidence_titles must be an array`)
    })
    return { ok: errors.length === 0, errors }
}

export function validateLaws(result: any): ValidationResult {
    const errors: string[] = []
    if (!Array.isArray(result)) {
        return { ok: false, errors: ['laws must be an array'] }
    }
    result.forEach((l: any, idx: number) => {
        if (!l || typeof l !== 'object') {
            errors.push(`law[${idx}] must be an object`)
            return
        }
        if (!isNonEmptyString(l.title)) errors.push(`law[${idx}].title missing or empty`)
        if (!isNonEmptyString(l.citation)) errors.push(`law[${idx}].citation missing or empty`)
        if (!isNonEmptyString(l.issue_title)) errors.push(`law[${idx}].issue_title missing or empty`)
        if (!isNonEmptyString(l.description)) {
            errors.push(`law[${idx}].description missing or empty`)
        } else {
            const desc = l.description
            if (!desc.includes('适用原因')) errors.push(`law[${idx}].description must include '适用原因'`)
            if (!desc.includes('证明作用')) errors.push(`law[${idx}].description must include '证明作用'`)
            if (!desc.includes('支持结论')) errors.push(`law[${idx}].description must include '支持结论'`)
        }
    })
    return { ok: errors.length === 0, errors }
}

export function validateArguments(result: any): ValidationResult {
    const errors: string[] = []
    if (!Array.isArray(result)) {
        return { ok: false, errors: ['arguments must be an array'] }
    }
    result.forEach((a: any, idx: number) => {
        if (!a || typeof a !== 'object') {
            errors.push(`argument[${idx}] must be an object`)
            return
        }
        if (!isNonEmptyString(a.title)) errors.push(`argument[${idx}].title missing or empty`)
        if (!isNonEmptyString(a.issue_title)) errors.push(`argument[${idx}].issue_title missing or empty`)
        if (!Array.isArray(a.fact_titles) || a.fact_titles.length === 0) errors.push(`argument[${idx}].fact_titles must be a non-empty array`)
        if (!Array.isArray(a.law_citations) || a.law_citations.length === 0) errors.push(`argument[${idx}].law_citations must be a non-empty array`)
        if (!isNonEmptyString(a.description)) errors.push(`argument[${idx}].description missing or empty`)
        if (!isNonEmptyString(a.conclusion)) errors.push(`argument[${idx}].conclusion missing or empty`)
    })
    return { ok: errors.length === 0, errors }
}

export function validateDocuments(result: any): ValidationResult {
    const errors: string[] = []
    if (!Array.isArray(result)) {
        return { ok: false, errors: ['documents must be an array'] }
    }
    // Check for at least one 起诉状 or 代理词
    const hasRequired = result.some((d: any) => {
        if (!d || typeof d !== 'object') return false
        const docType = d.document_type || ''
        const title = d.title || ''
        const content = d.content || ''
        if (typeof docType === 'string' && (docType.includes('起诉状') || docType.includes('代理词'))) return true
        if (typeof title === 'string' && (title.includes('起诉状') || title.includes('代理词'))) return true
        if (typeof content === 'string' && (content.includes('起诉状') || content.includes('代理词'))) return true
        return false
    })
    if (!hasRequired) errors.push('at least one document must be 起诉状 or 代理词')
    return { ok: errors.length === 0, errors }
}

export default {
    validateFacts,
    validateLaws,
    validateArguments,
    validateDocuments,
}
