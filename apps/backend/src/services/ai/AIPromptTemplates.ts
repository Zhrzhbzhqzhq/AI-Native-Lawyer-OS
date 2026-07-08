// Simple prompt template exporters
// Each function returns the task identifier / short description
// used by AIService when building the promptPack.

export function buildEvidencePrompt(_context: any) {
    return `你是一名中国资深诉讼律师。

下面是案件资料。

请识别哪些材料可以作为证据。

返回 JSON：

[
 {
     "title":"",
     "description":"",
     "evidence_type":""
 }
]

不要解释。
不要 Markdown。
只返回 JSON。`
}

export function buildFactPrompt(_context: any) {
    return `你是一名中国资深诉讼律师。

下面是案件中已经确认的证据。

请根据这些证据，提炼可以成立的案件事实。

返回 JSON：

[
 {
     "title":"",
     "description":""
 }
]

不要解释。
不要 Markdown。
只返回 JSON。`
}

export function buildIssuePrompt(_context: any) {
    return `你是一名中国资深诉讼律师。

下面是案件已经确认的事实。

请提炼案件真正需要解决的争议焦点。

返回 JSON：

[
 {
     "title":"",
     "description":""
 }
]

争议焦点数量控制在 3~8 个。

不要解释。
不要 Markdown。
只返回 JSON。`
}

export function buildLawPrompt(_context: any) {
    return `你是一名中国资深民商事诉讼律师。

下面是：

案件事实
争议焦点

请推荐适用的：

法律
司法解释
指导案例（如果适合）

返回 JSON：

[
    {
        "title":"",
        "citation":"",
        "description":""
    }
]

要求：

不要解释。
不要 Markdown。
只返回 JSON。`
}

export function buildArgumentPrompt(_context: any) {
    const facts = Array.isArray(_context && _context.facts) ? _context.facts : []
    const issues = Array.isArray(_context && _context.issues) ? _context.issues : []
    const laws = Array.isArray(_context && _context.laws) ? _context.laws : []

    return `你是一名中国资深民商事诉讼律师。

下面是已确认的案件事实：\n${JSON.stringify(facts, null, 2)}

下面是争议焦点：\n${JSON.stringify(issues, null, 2)}

下面是可适用的法律依据：\n${JSON.stringify(laws, null, 2)}

请基于上述事实、争议焦点与法律依据，组织能够支持原告诉讼请求的法律论证。

返回 JSON：

[
    {
        "title":"",
        "description":"",
        "conclusion":""
    }
]

要求：

不要 Markdown。
不要解释。
只返回 JSON.`
}

export function buildDocumentPrompt(_context: any) {
    const facts = Array.isArray(_context && _context.facts) ? _context.facts : []
    const issues = Array.isArray(_context && _context.issues) ? _context.issues : []
    const laws = Array.isArray(_context && _context.laws) ? _context.laws : []
    const argumentsList = Array.isArray(_context && _context.arguments) ? _context.arguments : []

    return `你是一名中国资深民商事诉讼律师。

下面提供：

案件事实：\n${JSON.stringify(facts, null, 2)}

争议焦点：\n${JSON.stringify(issues, null, 2)}

法律依据：\n${JSON.stringify(laws, null, 2)}

法律论证：\n${JSON.stringify(argumentsList, null, 2)}

请生成适合当前案件的法律文书建议。例如：起诉状、答辩状、代理词、庭审提纲、执行申请书等。

返回 JSON：

[
    {
        "title":"",
        "document_type":"",
        "content":""
    }
]

要求：

不要 Markdown。
不要解释。
只返回 JSON.`
}

export default {
    buildEvidencePrompt,
    buildFactPrompt,
    buildIssuePrompt,
    buildLawPrompt,
    buildArgumentPrompt,
    buildDocumentPrompt,
}
