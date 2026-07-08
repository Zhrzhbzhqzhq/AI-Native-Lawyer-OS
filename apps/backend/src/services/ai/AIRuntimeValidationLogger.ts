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

const LOG_DIR = path.resolve(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'ai_validation_runtime.jsonl')

export function logValidation(entry: LogEntry) {
    try {
        if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
        const line = JSON.stringify(entry)
        fs.appendFileSync(LOG_FILE, line + '\n')
    } catch (e) {
        // do not throw in logger
        console.error('Failed to write validation log', e)
    }
}

export default { logValidation }
