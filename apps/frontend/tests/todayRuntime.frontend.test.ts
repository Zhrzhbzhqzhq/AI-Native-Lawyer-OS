// Minimal integration check (not wired to runner)
import assert from 'assert'

async function run() {
    const res = await fetch('http://localhost:4000/today/runtime')
    assert(res.ok, 'request failed')
    const json = await res.json()
    assert(Array.isArray(json.review), 'review missing')
    assert(Array.isArray(json.ready), 'ready missing')
    assert(Array.isArray(json.handle), 'handle missing')
    assert(Array.isArray(json.completed), 'completed missing')
    assert(Array.isArray(json.risks), 'risks missing')
    console.log('ok')
}

if (require.main === module) {
    run().catch((e) => { console.error(e); process.exit(1) })
}
