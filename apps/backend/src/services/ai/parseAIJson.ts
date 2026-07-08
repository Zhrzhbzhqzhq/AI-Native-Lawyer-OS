export function parseAIJson(txt: string): { data: any | null; extracted?: string | null } {
    if (!txt || typeof txt !== 'string') return { data: null }

    // 1. Try direct JSON parse
    try {
        const parsed = JSON.parse(txt)
        return { data: parsed, extracted: txt }
    } catch (e) {
        // continue
    }

    // 2. Extract ```json blocks
    const codeBlockMatch = txt.match(/```json\s*([\s\S]*?)\s*```/i)
    if (codeBlockMatch && codeBlockMatch[1]) {
        try {
            const parsed = JSON.parse(codeBlockMatch[1])
            return { data: parsed, extracted: codeBlockMatch[1] }
        } catch (e) {
            // continue
        }
    }

    // 3. Extract first JSON array
    const arrayMatch = txt.match(/\[[\s\S]*?\]/)
    if (arrayMatch && arrayMatch[0]) {
        try {
            const parsed = JSON.parse(arrayMatch[0])
            return { data: parsed, extracted: arrayMatch[0] }
        } catch (e) {
            // continue
        }
    }

    // 4. Extract first JSON object
    const objMatch = txt.match(/\{[\s\S]*?\}/)
    if (objMatch && objMatch[0]) {
        try {
            const parsed = JSON.parse(objMatch[0])
            return { data: parsed, extracted: objMatch[0] }
        } catch (e) {
            // continue
        }
    }

    // nothing parsed
    return { data: null }
}

export default parseAIJson
