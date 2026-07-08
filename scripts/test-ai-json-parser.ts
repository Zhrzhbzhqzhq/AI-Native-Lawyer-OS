#!/usr/bin/env tsx
import parseAIJson from '../apps/backend/src/services/ai/AIJsonParser'

const tests: Array<{ name: string; input: any }> = [
    { name: 'raw object', input: { a: 1 } },
    { name: 'raw array', input: [{ x: 1 }, { y: 2 }] },
    { name: 'markdown json', input: '```json\n[ {"a":1}, {"b":2} ]\n```' },
    { name: 'double encoded', input: JSON.stringify(JSON.stringify([{ title: 't1' }])) },
    { name: 'text+json', input: 'Here is the result:\n[{"t":"ok"}]\nThanks' },
    { name: 'invalid string', input: 'not json at all' },
]

for (const t of tests) {
    const r = parseAIJson(t.input)
    console.log('---')
    console.log(t.name)
    console.log('input:', typeof t.input === 'string' ? t.input : JSON.stringify(t.input))
    console.log('result:', r)
}
