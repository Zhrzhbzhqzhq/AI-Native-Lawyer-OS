// Simple prompt template exporters
// Each function returns the task identifier / short description
// used by AIService when building the promptPack.

export function buildEvidencePrompt(_context: any) {
    return 'analyze_evidence'
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
