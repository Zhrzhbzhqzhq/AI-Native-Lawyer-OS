export type ValidationResult = {
    ok: boolean
    errors: string[]
}

function isNonEmptyString(v: any) {
    return typeof v === 'string' && v.trim().length > 0
}

const FACT_LEGAL_CONCLUSION_PATTERNS = [
    /(?:构成|属于).{0,8}(?:违约|侵权|犯罪)/,
    /(?:应当|依法应|应予).{0,12}(?:承担|负担).{0,8}(?:责任|赔偿)/,
    /(?:合同|协议|法律关系).{0,8}(?:有效|无效|成立|不成立)/,
    /(?:应当|应予|足以).{0,8}(?:认定|支持|推定|视为)/,
    /(?:诉讼请求|主张).{0,12}(?:应予|应当).{0,8}支持/,
    /(?:证据.{0,8})?足以证明/,
]

export function findFactLegalConclusion(title: unknown, description: unknown) {
    const text = `${String(title || '')}\n${String(description || '')}`
    return FACT_LEGAL_CONCLUSION_PATTERNS.find((pattern) => pattern.test(text))?.source || null
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
        if (!Array.isArray(f.evidence_titles)) {
            errors.push(`fact[${idx}].evidence_titles must be an array`)
        } else {
            const validTitles = f.evidence_titles.filter((title: unknown) => isNonEmptyString(title))
            if (validTitles.length !== f.evidence_titles.length) errors.push(`fact[${idx}].evidence_titles must contain only non-empty strings`)
            if (f.category === 'confirmed' && validTitles.length === 0) errors.push(`fact[${idx}].confirmed fact must reference evidence`)
        }
        if (f.category === 'to_prove' && isNonEmptyString(f.description) && !/(?:待核实|尚缺|缺少|需补充|证据不足|尚待|无法确认)/.test(f.description)) {
            errors.push(`fact[${idx}].to_prove description must identify missing proof`)
        }
        if (f.category === 'disputed' && isNonEmptyString(f.description) && !/(?:争议|异议|否认|不一致|矛盾)/.test(f.description)) {
            errors.push(`fact[${idx}].disputed description must identify the dispute source`)
        }
        if (findFactLegalConclusion(f.title, f.description)) errors.push(`fact[${idx}] contains legal conclusion`)
    })
    return { ok: errors.length === 0, errors }
}

const ISSUE_OPEN_MARKERS = /(?:是否|能否|应否|可否|如何|有无|与否|何种|哪些|什么|待审查|需审查|需要审查|尚需审查|争议在于)/

const ISSUE_LEGAL_CONCLUSION_PATTERNS = [
    /(?:已经|已然|显然|必然|当然|依法)?构成.{0,8}(?:违约|侵权|犯罪)/,
    /(?:应当|依法应|应予|必须).{0,12}(?:承担|赔偿|支付|返还).{0,8}(?:责任|损失|款项|价款|费用)?/,
    /(?:合同|协议|法律关系).{0,12}(?:合法有效|无效|已经成立|已成立|不成立|(?:已|已经)?认定为(?:有效|无效))/,
    /(?:诉讼请求|请求|主张).{0,12}(?:应予支持|应当支持|应予驳回|应当驳回)/,
    /(?:必然胜诉|必然败诉|一定胜诉|一定败诉)/,
    /(?:证据|现有证据).{0,12}(?:充分|足以证明|已经证明)/,
    /(?:异议|抗辩|主张).{0,8}(?:不能成立|不成立|已经成立|成立)/,
    /(?:已经|已然|显然|必然).{0,4}(?:违约|侵权|违法|犯罪)/,
    /(?:责任|义务).{0,8}(?:已经成立|已成立)/,
]

export function findIssueBoundaryViolation(title: unknown, description: unknown) {
    const segments = `${String(title || '')}\n${String(description || '')}`
        .split(/[\n。；;]/)
        .map((segment) => segment.trim())
        .filter(Boolean)

    for (const segment of segments) {
        if (ISSUE_OPEN_MARKERS.test(segment)) continue
        const matched = ISSUE_LEGAL_CONCLUSION_PATTERNS.find((pattern) => pattern.test(segment))
        if (matched) return matched.source
    }
    return null
}

export function validateIssues(result: any): ValidationResult {
    const errors: string[] = []
    if (!Array.isArray(result)) return { ok: false, errors: ['issues must be an array'] }
    if (result.length === 0) errors.push('issues must not be empty')

    result.forEach((issue: any, idx: number) => {
        if (!issue || typeof issue !== 'object') {
            errors.push(`issue[${idx}] must be an object`)
            return
        }
        if (!isNonEmptyString(issue.title)) errors.push(`issue[${idx}].title missing or empty`)
        if (!isNonEmptyString(issue.description)) errors.push(`issue[${idx}].description missing or empty`)
        if (!isNonEmptyString(issue.ai_reasoning) && !isNonEmptyString(issue.reasoning)) errors.push(`issue[${idx}].ai_reasoning missing or empty`)

        const factTitles = Array.isArray(issue.fact_titles) ? issue.fact_titles : []
        const sourceFactIds = Array.isArray(issue.source_fact_ids) ? issue.source_fact_ids : []
        const sourceValues = factTitles.length > 0 ? factTitles : sourceFactIds
        if (sourceValues.length === 0 || sourceValues.some((value: unknown) => !isNonEmptyString(value))) {
            errors.push(`issue[${idx}] must reference at least one Fact`)
        }

        if (typeof issue.confidence !== 'number' || !Number.isFinite(issue.confidence) || issue.confidence < 0 || issue.confidence > 1) {
            errors.push(`issue[${idx}].confidence must be between 0 and 1`)
        }
        if (findIssueBoundaryViolation(issue.title, issue.description)) errors.push(`issue[${idx}] contains legal conclusion`)
    })
    return { ok: errors.length === 0, errors }
}

const LAW_CITATION_PLACEHOLDER_PATTERNS = [
    /第\s*[xyｘｙ]+\s*条/i,
    /(?:指导案例|典型案例)\s*(?:第)?\s*[xyｘｙ]+\s*号/i,
    /(?:某法|某条例|某规定|相关法律|相关规定)/,
    /\b(?:TODO|placeholder)\b/i,
]

const LAW_CITATION_FORMATS = [
    /《[^》]+》.{0,24}第[零一二三四五六七八九十百千万0-9]+条/,
    /(?:指导案例|典型案例).{0,24}(?:第)?[零一二三四五六七八九十百千万0-9]+号/,
]

const LAW_OPEN_MARKERS = /(?:是否|能否|应否|可否|如何|有无|需审查|需要审查|用于审查|尚需核验|需要核验|可能适用)/

const LAW_FINAL_CONCLUSION_PATTERNS = [
    /(?:本案|原告|被告|申请人|被申请人|上诉人|被上诉人|债权人|债务人).{0,24}(?:已经|应当|依法应|应予|必须|有权|无权).{0,24}(?:构成|承担|支付|返还|赔偿|支持|驳回|成立|不成立|胜诉|败诉)/,
    /(?:本案)?(?:诉讼请求|请求|主张).{0,16}(?:应予支持|应当支持|应予驳回|应当驳回)/,
    /(?:本案)?(?:证据|现有证据).{0,16}(?:充分|足以证明|已经证明)/,
    /(?:本案)?(?:异议|抗辩|主张).{0,12}(?:不能成立|不成立|已经成立)/,
    /(?:必然胜诉|必然败诉|一定胜诉|一定败诉)/,
]

export function findLawBoundaryViolation(...values: unknown[]) {
    const segments = values
        .map((value) => String(value || ''))
        .join('\n')
        .split(/[\n。；;]/)
        .map((segment) => segment.trim())
        .filter(Boolean)
    for (const segment of segments) {
        if (LAW_OPEN_MARKERS.test(segment)) continue
        const matched = LAW_FINAL_CONCLUSION_PATTERNS.find((pattern) => pattern.test(segment))
        if (matched) return matched.source
    }
    return null
}

export function findLawCitationViolation(value: unknown) {
    const citation = String(value || '').trim()
    if (!citation) return 'citation_required'
    const placeholder = LAW_CITATION_PLACEHOLDER_PATTERNS.find((pattern) => pattern.test(citation))
    if (placeholder) return placeholder.source
    if (!LAW_CITATION_FORMATS.some((pattern) => pattern.test(citation))) return 'citation_format_invalid'
    return null
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
        else if (findLawCitationViolation(l.citation)) errors.push(`law[${idx}].citation invalid or unsafe`)
        if (!isNonEmptyString(l.issue_title)) errors.push(`law[${idx}].issue_title missing or empty`)
        if (!isNonEmptyString(l.rule_content)) errors.push(`law[${idx}].rule_content missing or empty`)
        if (!isNonEmptyString(l.application)) errors.push(`law[${idx}].application missing or empty`)
        if (!isNonEmptyString(l.limitations)) errors.push(`law[${idx}].limitations missing or empty`)
        if (typeof l.confidence !== 'undefined' && (typeof l.confidence !== 'number' || !Number.isFinite(l.confidence) || l.confidence < 0 || l.confidence > 1)) {
            errors.push(`law[${idx}].confidence must be between 0 and 1`)
        }
        if (findLawBoundaryViolation(l.application, l.limitations)) errors.push(`law[${idx}] contains final case conclusion`)
    })
    return { ok: errors.length === 0, errors }
}

const ARGUMENT_BOUNDARY_PATTERNS = [
    /(?:必然|一定|肯定|毫无疑问).{0,8}(?:胜诉|败诉)/,
    /(?:法院|人民法院|审判机关).{0,16}(?:必然|一定|肯定|必须).{0,12}(?:支持|驳回|判决|认定)/,
    /(?:诉讼请求|请求|主张).{0,16}(?:必然|一定|肯定|当然).{0,8}(?:支持|驳回|成立|不成立)/,
    /(?:必然|当然|无条件|毫无疑问).{0,12}(?:承担|负担).{0,8}(?:全部|所有|完全)?(?:责任|赔偿)/,
    /(?:已经|足以).{0,8}(?:排除一切|排除全部).{0,8}(?:争议|异议|合理怀疑)/,
]

export function findArgumentBoundaryViolation(...values: unknown[]) {
    const segments = values
        .map((value) => String(value || ''))
        .join('\n')
        .split(/[\n。；;]/)
        .map((segment) => segment.trim())
        .filter(Boolean)

    for (const segment of segments) {
        const matched = ARGUMENT_BOUNDARY_PATTERNS.find((pattern) => pattern.test(segment))
        if (matched) return matched.source
    }
    return null
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
        if (!Array.isArray(a.fact_titles) || a.fact_titles.length === 0 || a.fact_titles.some((value: unknown) => !isNonEmptyString(value))) {
            errors.push(`argument[${idx}].fact_titles must contain only non-empty strings`)
        }
        if (!Array.isArray(a.law_citations) || a.law_citations.length === 0 || a.law_citations.some((value: unknown) => !isNonEmptyString(value))) {
            errors.push(`argument[${idx}].law_citations must contain only non-empty strings`)
        }
        if (!isNonEmptyString(a.position)) errors.push(`argument[${idx}].position missing or empty`)
        if (!isNonEmptyString(a.reasoning)) errors.push(`argument[${idx}].reasoning missing or empty`)
        if (!isNonEmptyString(a.counter_argument)) errors.push(`argument[${idx}].counter_argument missing or empty`)
        if (!isNonEmptyString(a.response)) errors.push(`argument[${idx}].response missing or empty`)
        if (!isNonEmptyString(a.risk)) errors.push(`argument[${idx}].risk missing or empty`)
        if (!isNonEmptyString(a.conclusion)) errors.push(`argument[${idx}].conclusion missing or empty`)
        if (findArgumentBoundaryViolation(a.position, a.reasoning, a.response, a.conclusion)) {
            errors.push(`argument[${idx}] contains final outcome or absolute liability conclusion`)
        }
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

const COMPLAINT_TOP_LEVEL_FIELDS = [
    'document_type', 'title', 'parties', 'claims', 'facts', 'reasoning', 'legal_basis',
    'evidence_reference', 'conclusion', 'court', 'signature', 'date',
]
const DOCUMENT_PLACEHOLDERS = new Set([
    '【待律师补充】',
    '【待律师补充：受理法院】',
    '【待律师根据已确认 Argument 和案件目标补充】',
])
const DOCUMENT_BOUNDARY_PATTERNS = [
    /必然胜诉|一定胜诉|法院一定支持|法院必然支持|对方一定承担责任|对方必然承担责任/,
    /LAWDESK_FORMAL_(?:ARGUMENT|LAW)_V2/,
    /source_(?:argument|fact|issue|law|evidence)_ids/i,
    /\bconfidence\b|AI reasoning|DOCUMENT_REASONING_SCOPE|internal_constraints/i,
    /```|\{\s*"(?:document_type|argument_sections)"/,
]

function stringArray(value: unknown) {
    return Array.isArray(value) && value.every((item) => isNonEmptyString(item))
}

function exactKeys(value: any, keys: string[]) {
    return value && typeof value === 'object' && !Array.isArray(value)
        && Object.keys(value).sort().join('|') === [...keys].sort().join('|')
}

function extractLegalTokens(text: string) {
    return {
        amounts: Array.from(text.matchAll(/(?:人民币|￥)?\s*\d[\d,]*(?:\.\d+)?\s*(?:元|万元|亿元)/g), (match) => match[0].replace(/\s+/g, '')),
        dates: Array.from(text.matchAll(/\d{4}[年./-]\d{1,2}[月./-]\d{1,2}日?/g), (match) => match[0]),
    }
}

export function validateComplaintSections(result: any, scope: any): ValidationResult {
    const errors: string[] = []
    if (!exactKeys(result, COMPLAINT_TOP_LEVEL_FIELDS)) return { ok: false, errors: ['complaint sections top-level schema invalid'] }
    if (result.document_type !== 'complaint') errors.push('document_type must be complaint')
    if (!isNonEmptyString(result.title)) errors.push('title missing or empty')
    if (!exactKeys(result.parties, ['plaintiff', 'defendant'])) errors.push('parties schema invalid')
    const verifiedParties = scope?.matter_identity?.verified_parties || {}
    for (const side of ['plaintiff', 'defendant']) {
        const value = result.parties?.[side]
        const allowed = verifiedParties[side]
        if (!isNonEmptyString(value)) errors.push(`parties.${side} missing`)
        else if (allowed ? value !== allowed : value !== '【待律师补充】') errors.push(`parties.${side} is not verified or placeholder`)
    }
    for (const field of ['claims', 'facts', 'reasoning', 'legal_basis', 'evidence_reference']) {
        if (!Array.isArray(result[field])) errors.push(`${field} must be an array`)
    }
    if (errors.length) return { ok: false, errors }

    const sections = Array.isArray(scope?.argument_sections) ? scope.argument_sections : []
    const argumentById = new Map(sections.map((item: any) => [String(item.argument_id), item]))
    const factById = new Map(sections.flatMap((item: any) => item.usable_facts.map((fact: any) => [String(fact.fact_id), fact])))
    const lawById = new Map(sections.flatMap((item: any) => item.usable_laws.map((law: any) => [String(law.law_id), law])))
    const evidenceById = new Map(sections.flatMap((item: any) => item.evidences.map((evidence: any) => [String(evidence.evidence_id), evidence])))
    const allowedCitations = new Set(Array.from(lawById.values(), (law: any) => String(law.citation)))
    const allowedEvidenceTitles = new Set(Array.from(evidenceById.values(), (evidence: any) => String(evidence.title)))

    result.claims.forEach((claim: any, index: number) => {
        if (!exactKeys(claim, ['text', 'source_argument_ids', 'source_fact_ids', 'requires_lawyer_confirmation'])) errors.push(`claim[${index}] schema invalid`)
        if (!isNonEmptyString(claim?.text)) errors.push(`claim[${index}].text missing`)
        if (claim?.requires_lawyer_confirmation !== true) errors.push(`claim[${index}] must require lawyer confirmation`)
        if (!stringArray(claim?.source_argument_ids) && claim?.source_argument_ids?.length !== 0) errors.push(`claim[${index}].source_argument_ids invalid`)
        if (!stringArray(claim?.source_fact_ids) && claim?.source_fact_ids?.length !== 0) errors.push(`claim[${index}].source_fact_ids invalid`)
        for (const id of claim?.source_argument_ids || []) if (!argumentById.has(String(id))) errors.push(`claim[${index}] argument outside scope`)
        for (const id of claim?.source_fact_ids || []) if (!factById.has(String(id))) errors.push(`claim[${index}] fact outside scope`)
    })
    result.facts.forEach((fact: any, index: number) => {
        if (!exactKeys(fact, ['text', 'source_fact_ids', 'source_evidence_ids'])) errors.push(`fact[${index}] schema invalid`)
        if (!isNonEmptyString(fact?.text) || !stringArray(fact?.source_fact_ids) || !stringArray(fact?.source_evidence_ids)) errors.push(`fact[${index}] fields invalid`)
        for (const factId of fact?.source_fact_ids || []) if (!factById.has(String(factId))) errors.push(`fact[${index}] fact outside scope`)
        for (const evidenceId of fact?.source_evidence_ids || []) {
            const evidence: any = evidenceById.get(String(evidenceId))
            if (!evidence) errors.push(`fact[${index}] evidence outside scope`)
            else if (!(fact?.source_fact_ids || []).includes(String(evidence.fact_id))) errors.push(`fact[${index}] evidence does not support referenced fact`)
        }
    })
    result.reasoning.forEach((item: any, index: number) => {
        if (!exactKeys(item, ['issue_id', 'argument_id', 'position', 'analysis', 'source_fact_ids', 'source_law_ids'])) errors.push(`reasoning[${index}] schema invalid`)
        const argument: any = argumentById.get(String(item?.argument_id))
        if (!argument || String(argument.issue?.issue_id) !== String(item?.issue_id)) errors.push(`reasoning[${index}] issue and argument scope mismatch`)
        if (!isNonEmptyString(item?.position) || !isNonEmptyString(item?.analysis)) errors.push(`reasoning[${index}] content missing`)
        const scopedFacts = new Set((argument?.usable_facts || []).map((fact: any) => String(fact.fact_id)))
        const scopedLaws = new Set((argument?.usable_laws || []).map((law: any) => String(law.law_id)))
        if (!stringArray(item?.source_fact_ids) || item.source_fact_ids.some((id: string) => !scopedFacts.has(String(id)))) errors.push(`reasoning[${index}] fact outside argument scope`)
        if (!stringArray(item?.source_law_ids) || item.source_law_ids.some((id: string) => !scopedLaws.has(String(id)))) errors.push(`reasoning[${index}] law outside argument scope`)
    })
    result.legal_basis.forEach((law: any, index: number) => {
        if (!exactKeys(law, ['citation', 'text', 'source_law_id'])) errors.push(`legal_basis[${index}] schema invalid`)
        const source: any = lawById.get(String(law?.source_law_id))
        if (!source) errors.push(`legal_basis[${index}] law outside scope`)
        if (!isNonEmptyString(law?.citation) || !allowedCitations.has(String(law.citation)) || source?.citation !== law.citation) errors.push(`legal_basis[${index}] citation not allowed`)
        if (!isNonEmptyString(law?.text)) errors.push(`legal_basis[${index}].text missing`)
    })
    result.evidence_reference.forEach((evidence: any, index: number) => {
        if (!exactKeys(evidence, ['evidence_id', 'title', 'purpose'])) errors.push(`evidence_reference[${index}] schema invalid`)
        const source: any = evidenceById.get(String(evidence?.evidence_id))
        if (!source) errors.push(`evidence_reference[${index}] evidence outside scope`)
        if (!isNonEmptyString(evidence?.title) || !allowedEvidenceTitles.has(String(evidence.title)) || source?.title !== evidence.title) errors.push(`evidence_reference[${index}] title not allowed`)
    })

    const publicText = [result.title, result.parties.plaintiff, result.parties.defendant,
        ...result.claims.map((item: any) => item.text), ...result.facts.map((item: any) => item.text),
        ...result.reasoning.flatMap((item: any) => [item.position, item.analysis]),
        ...result.legal_basis.flatMap((item: any) => [item.citation, item.text]),
        ...result.evidence_reference.flatMap((item: any) => [item.title, item.purpose]),
        result.conclusion, result.court, result.signature, result.date].join('\n')
    if (DOCUMENT_BOUNDARY_PATTERNS.some((pattern) => pattern.test(publicText))) errors.push('document content boundary violation')
    const internalTexts = sections.flatMap((item: any) => [item.internal_constraints.counter_argument, item.internal_constraints.risk, ...item.internal_constraints.law_limitations.map((law: any) => law.limitations)]).filter(isNonEmptyString)
    if (internalTexts.some((text: string) => publicText.includes(text))) errors.push('internal constraint leaked into public content')

    const allowedSourceText = JSON.stringify(scope)
    const outputTokens = extractLegalTokens(publicText)
    const allowedTokens = extractLegalTokens(allowedSourceText)
    if (outputTokens.amounts.some((token) => !allowedTokens.amounts.includes(token))) errors.push('document contains amount outside scope')
    if (outputTokens.dates.some((token) => !allowedTokens.dates.includes(token))) errors.push('document contains date outside scope')
    if (![result.court, result.signature, result.date].every((value) => DOCUMENT_PLACEHOLDERS.has(String(value)) || allowedSourceText.includes(String(value)))) errors.push('missing identity field must use placeholder')

    return { ok: errors.length === 0, errors }
}

export default {
    validateFacts,
    validateIssues,
    validateLaws,
    validateArguments,
    validateDocuments,
    validateComplaintSections,
}
