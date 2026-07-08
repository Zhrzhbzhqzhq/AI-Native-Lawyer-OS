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
    return 'analyze_laws'
}

export function buildArgumentPrompt(_context: any) {
    return 'analyze_arguments'
}

export function buildDocumentPrompt(_context: any) {
    return 'generate_documents'
}

export default {
    buildEvidencePrompt,
    buildFactPrompt,
    buildIssuePrompt,
    buildLawPrompt,
    buildArgumentPrompt,
    buildDocumentPrompt,
}
