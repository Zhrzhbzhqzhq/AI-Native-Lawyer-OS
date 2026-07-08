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
    // Must contain at least 2 documents and must include 起诉状 and 证据目录
    if (result.length < 2) errors.push('at least 2 documents required')

    const lowerContains = (s: any, keywords: string[]) => {
        if (typeof s !== 'string') return false
        const low = s
        return keywords.some(k => low.includes(k))
    }

    let has_qs = false
    let has_zj = false
    const forbidden = [/……/, /待补充/, /某某/, /此处填写/, /模板/, /占位/]

    result.forEach((d: any, idx: number) => {
        if (!d || typeof d !== 'object') {
            errors.push(`document[${idx}] must be an object`)
            return
        }
        const docType = String(d.document_type || '')
        const title = String(d.title || '')
        const content = String(d.content || '')

        if (lowerContains(docType + title + content, ['起诉状'])) has_qs = true
        if (lowerContains(docType + title + content, ['证据目录', '证据清单'])) has_zj = true

        if (!isNonEmptyString(d.title)) errors.push(`document[${idx}].title missing or empty`)
        if (!isNonEmptyString(d.document_type)) errors.push(`document[${idx}].document_type missing or empty`)
        if (!isNonEmptyString(d.content)) errors.push(`document[${idx}].content missing or empty`)
        else {
            if (d.content.trim().length < 300) errors.push(`document[${idx}].content must be at least 300 characters`)
            // check forbidden placeholders
            forbidden.forEach((re) => { if (re.test(d.content)) errors.push(`document[${idx}].content contains forbidden placeholder or template token`) })
            // check required sections for 起诉状 and 证据目录 where applicable
            if (lowerContains(docType + title, ['起诉状'])) {
                if (!d.content.includes('诉讼请求')) errors.push(`document[${idx}].content must include 诉讼请求`)
                if (!d.content.includes('事实与理由')) errors.push(`document[${idx}].content must include 事实与理由`)
                if (!d.content.includes('证据')) errors.push(`document[${idx}].content should include 证据 or 证据清单`)
            }
            if (lowerContains(docType + title, ['证据目录', '证据清单'])) {
                if (!d.content.includes('证明目的') && !d.content.includes('证明目的：')) errors.push(`document[${idx}].content for 证据目录 should include 证明目的 or explanation for each evidence item`)
            }
        }
    })

    if (!has_qs) errors.push('missing required document: 起诉状')
    if (!has_zj) errors.push('missing required document: 证据目录')
    return { ok: errors.length === 0, errors }
}

export default {
    validateFacts,
    validateLaws,
    validateArguments,
    validateDocuments,
}
