import fs from 'fs'
import path from 'path'

type LogEntry = {
    timestamp: string
    module: string
    provider: string
    model: string
    validation: 'PASS' | 'FAIL'
    retry: number
    fallback: boolean
    missing_fields: string[]
    latency_ms: number | null
}

// Prefer repository-level `logs/` directory. Try process.cwd() first, then
// fall back to a path relative to this file (repo root approximation).
const CANDIDATE_DIRS = [
    path.resolve(process.cwd(), 'logs'),
    path.resolve(__dirname, '../../../../logs'),
]

function ensureLogPath() {
    for (const dir of CANDIDATE_DIRS) {
        try {
            fs.mkdirSync(dir, { recursive: true })
            const file = path.join(dir, 'ai_validation_runtime.jsonl')
            // Ensure the file exists (open in append mode then close)
            try {
                const fd = fs.openSync(file, 'a')
                fs.closeSync(fd)
            } catch (_e) {
                // ignore
            }
            return { dir, file }
        } catch (_e) {
            // try next candidate
        }
    }
    // As a last resort, use process.cwd()/logs
    const fallbackDir = path.resolve(process.cwd(), 'logs')
    try { fs.mkdirSync(fallbackDir, { recursive: true }) } catch (_e) { }
    const fallbackFile = path.join(fallbackDir, 'ai_validation_runtime.jsonl')
    try { const fd = fs.openSync(fallbackFile, 'a'); fs.closeSync(fd) } catch (_e) { }
    return { dir: fallbackDir, file: fallbackFile }
}

const { dir: LOG_DIR, file: LOG_FILE } = ensureLogPath()

export function logValidation(entry: LogEntry) {
    try {
        const line = JSON.stringify(entry)
        fs.appendFileSync(LOG_FILE, line + '\n')
    } catch (e) {
        // do not throw in logger
        console.error('Failed to write validation log', e)
    }
}

export default { logValidation }
