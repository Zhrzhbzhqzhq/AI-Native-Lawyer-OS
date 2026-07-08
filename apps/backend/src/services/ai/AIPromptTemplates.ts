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
    return 'analyze_facts'
}

export function buildIssuePrompt(_context: any) {
    return 'analyze_issues'
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
