export type ParseResult = { ok: true; data: any } | { ok: false; error: string; raw: unknown }

function stripBOM(s: string) {
    return s.replace(/\uFEFF/g, '')
}

function stripFences(s: string) {
    return s.replace(/```json\s*/g, '').replace(/```/g, '')
}

function normalizeEscapes(s: string) {
    // convert common escaped sequences to their literal equivalents when safe
    return s.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
}

function escapeNewlinesInsideStrings(src: string) {
    // convert actual newline characters that appear inside JSON string literals
    // into escaped \n so JSON.parse can succeed when LLM outputs raw newlines inside strings
    let out = ''
    let inString = false
    let escape = false
    for (let i = 0; i < src.length; i++) {
        const ch = src[i]
        if (ch === '"' && !escape) {
            inString = !inString
            out += ch
            continue
        }
        if (ch === '\\' && !escape) {
            escape = true
            out += ch
            continue
        }
        if ((ch === '\n' || ch === '\r') && inString && !escape) {
            out += '\\n'
            continue
        }
        out += ch
        escape = false
    }
    return out
}

function multiJSONParse(candidate: string, maxDepth = 4): { ok: boolean; value?: any } {
    let cur = candidate
    for (let i = 0; i < maxDepth; i++) {
        try {
            const v = JSON.parse(cur)
            if (typeof v === 'string') {
                cur = v
                continue
            }
            return { ok: true, value: v }
        } catch (_e) {
            return { ok: false }
        }
    }
    return { ok: false }
}

function extractFirstJsonLike(s: string): string | null {
    const firstBrace = s.indexOf('{')
    const firstBracket = s.indexOf('[')
    let start = -1
    if (firstBrace >= 0 && (firstBracket === -1 || firstBrace < firstBracket)) start = firstBrace
    else if (firstBracket >= 0) start = firstBracket
    if (start === -1) return null

    // find last matching '}' or ']' by searching from end
    const lastBrace = s.lastIndexOf('}')
    const lastBracket = s.lastIndexOf(']')
    let end = Math.max(lastBrace, lastBracket)
    if (end <= start) return null
    return s.substring(start, end + 1)
}

export default function parseAIJson(input: unknown): ParseResult {
    try {
        // 1) Already object/array
        if (input !== null && typeof input === 'object') return { ok: true, data: input }

        if (typeof input !== 'string') {
            // attempt to stringify+parse
            try {
                const s = String(input)
                // fallthrough to string handling
                input = s
            } catch (e) {
                return { ok: false, error: 'unsupported input type', raw: input }
            }
        }

        let s = (input as string)
        s = stripBOM(s)
        s = s.trim()
        s = stripFences(s)

        // quick attempts: direct parse, then normalized escapes, then extract
        // 2) Try multi-depth parse directly
        let attempt = multiJSONParse(s)
        if (attempt.ok) return { ok: true, data: attempt.value }

        // 3) Normalize escaped sequences and try multi-parse
        const norm = normalizeEscapes(s)
        attempt = multiJSONParse(norm)
        if (attempt.ok) return { ok: true, data: attempt.value }

        // 3b) Try escaping raw newlines inside string literals then parse
        try {
            const escapedNewlines = escapeNewlinesInsideStrings(s)
            attempt = multiJSONParse(escapedNewlines)
            if (attempt.ok) return { ok: true, data: attempt.value }
            // also try normalizing escapes after fixing newlines
            attempt = multiJSONParse(normalizeEscapes(escapedNewlines))
            if (attempt.ok) return { ok: true, data: attempt.value }
        } catch (_e) {
            // ignore
        }

        // 4) If wrapped as a JSON string, try JSON.parse once then multi-parse the result
        try {
            const once = JSON.parse(s)
            if (typeof once === 'string') {
                const secondAttempt = multiJSONParse(once)
                if (secondAttempt.ok) return { ok: true, data: secondAttempt.value }
                // try normalized escapes on once
                const secondAttempt2 = multiJSONParse(normalizeEscapes(once))
                if (secondAttempt2.ok) return { ok: true, data: secondAttempt2.value }
                // try cleaning escaped quotes
                const cleaned = once.replace(/\\"/g, '"')
                const secondAttempt3 = multiJSONParse(cleaned)
                if (secondAttempt3.ok) return { ok: true, data: secondAttempt3.value }
                return { ok: true, data: once }
            } else if (typeof once === 'object') {
                return { ok: true, data: once }
            }
        } catch (_e) {
            // ignore
        }

        // 5) Extract first JSON-like substring and try parse
        const extracted = extractFirstJsonLike(s)
        if (extracted) {
            const cleaned = extracted.trim()
            let r = multiJSONParse(cleaned)
            if (r.ok) return { ok: true, data: r.value }
            // try normalize escapes on extracted
            r = multiJSONParse(normalizeEscapes(cleaned))
            if (r.ok) return { ok: true, data: r.value }
            // maybe double encoded
            try {
                const once = JSON.parse(cleaned)
                if (typeof once === 'string') {
                    const second = multiJSONParse(once)
                    if (second.ok) return { ok: true, data: second.value }
                    return { ok: true, data: once }
                } else if (typeof once === 'object') {
                    return { ok: true, data: once }
                }
            } catch (_e) {
                // ignore
            }
        }

        // 6) As a last resort, try to unescape common escaped unicode sequences and parse
        try {
            const unescaped = s.replace(/\\\"/g, '"').replace(/\\n/g, '\n')
            const finalAttempt = multiJSONParse(unescaped)
            if (finalAttempt.ok) return { ok: true, data: finalAttempt.value }
        } catch (_e) {
            // ignore
        }

        return { ok: false, error: 'unable to parse json', raw: input }
    } catch (err: any) {
        return { ok: false, error: String(err), raw: input }
    }
}
