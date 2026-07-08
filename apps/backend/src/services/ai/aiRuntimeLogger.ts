import fs from 'fs'
import path from 'path'

const LOG_PATH = path.join(process.cwd(), 'docs', 'testing', 'ai_runtime_logs.jsonl')
const REPORT_PATH = path.join(process.cwd(), 'docs', 'testing', 'provider-runtime-report.md')

function ensureDir() {
    const dir = path.dirname(LOG_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function logAIRequest(entry: any) {
    try {
        ensureDir()
        const line = JSON.stringify(Object.assign({ timestamp: new Date().toISOString() }, entry))
        fs.appendFileSync(LOG_PATH, line + '\n')

        // Simple report append for visibility
        const short = `- Provider: ${entry.provider || 'unknown'}, Model: ${entry.model || 'unknown'}, Matter: ${entry.matter_id || '-'}, Duration: ${entry.duration_ms || 0}ms, Fallback: ${entry.fallback ? 'yes' : 'no'}, PromptVersion: ${entry.prompt_version || 'v1'}\n`
        fs.appendFileSync(REPORT_PATH, short)
    } catch (e) {
        // ignore logging errors
        // console.error('logAIRequest failed', e)
    }
}

export default { logAIRequest }
