import fs from 'fs'
import path from 'path'

function loggingEnabled() {
    if (process.env.NODE_ENV === 'production') return false
    return process.env.AI_RUNTIME_LOCAL_LOG === 'true'
}

function logDirectory() {
    const configured = String(process.env.AI_RUNTIME_LOG_DIR || '').trim()
    return configured ? path.resolve(configured) : path.join(process.cwd(), 'logs', 'ai-runtime')
}

function logPaths() {
    const dir = logDirectory()
    return {
        logPath: path.join(dir, 'ai_runtime_logs.jsonl'),
        reportPath: path.join(dir, 'provider-runtime-report.md'),
    }
}

function ensureDir(filePath: string) {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function appendLine(filePath: string, line: string) {
    if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath)
        if (stat.size > 0) {
            const fd = fs.openSync(filePath, 'r')
            try {
                const buffer = Buffer.alloc(1)
                fs.readSync(fd, buffer, 0, 1, stat.size - 1)
                if (buffer.toString() !== '\n') fs.appendFileSync(filePath, '\n')
            } finally {
                fs.closeSync(fd)
            }
        }
    }
    fs.appendFileSync(filePath, line + '\n')
}

export function logAIRequest(entry: any) {
    if (!loggingEnabled()) return
    try {
        const { logPath, reportPath } = logPaths()
        ensureDir(logPath)
        const normalized = {
            timestamp: new Date().toISOString(),
            provider: entry.provider || 'unknown',
            model: entry.model || 'unknown',
            matter_id: entry.matter_id || null,
            workspace: entry.workspace || null,
            duration_ms: typeof entry.duration_ms === 'number' ? entry.duration_ms : null,
            prompt_tokens: typeof entry.prompt_tokens === 'number' ? entry.prompt_tokens : null,
            completion_tokens: typeof entry.completion_tokens === 'number' ? entry.completion_tokens : null,
            retry: typeof entry.retry === 'number' ? entry.retry : 0,
            cost: typeof entry.cost === 'number' ? entry.cost : null,
            fallback: Boolean(entry.fallback),
            prompt_version: entry.prompt_version || 'v1',
            context_sizes: entry.context_sizes || {},
        }
        const line = JSON.stringify(normalized)
        appendLine(logPath, line)

        // Simple report append for visibility
        const short = `- Provider: ${normalized.provider}, Model: ${normalized.model}, Matter: ${normalized.matter_id || '-'}, Duration: ${normalized.duration_ms ?? 0}ms, PromptTokens: ${normalized.prompt_tokens ?? '-'}, CompletionTokens: ${normalized.completion_tokens ?? '-'}, Retry: ${normalized.retry}, Cost: ${normalized.cost ?? '-'}, Fallback: ${normalized.fallback ? 'yes' : 'no'}, PromptVersion: ${normalized.prompt_version}\n`
        appendLine(reportPath, short.trimEnd())
    } catch (e) {
        // ignore logging errors
        // console.error('logAIRequest failed', e)
    }
}

export default { logAIRequest }
