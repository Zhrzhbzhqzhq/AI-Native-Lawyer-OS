import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { buildApp } from '../src/server'
import ChiefService from '../src/services/chiefService'

let app: any

beforeAll(async () => {
    app = await buildApp()
    await app.listen({ port: 0 })
})

afterAll(async () => {
    await app.close()
})

describe('GET /today/runtime', () => {
    it('returns 200 and five arrays', async () => {
        const res = await app.inject({ method: 'GET', url: '/today/runtime' })
        expect(res.statusCode).toBe(200)
        const body = JSON.parse(res.body)
        expect(Array.isArray(body.review)).toBe(true)
        expect(Array.isArray(body.ready)).toBe(true)
        expect(Array.isArray(body.handle)).toBe(true)
        expect(Array.isArray(body.completed)).toBe(true)
        expect(Array.isArray(body.risks)).toBe(true)
    })

    it('returns 500 when ChiefService throws', async () => {
        // monkeypatch ChiefService to throw
        const orig = (ChiefService as any).prototype.generateTodayRuntime
            ; (ChiefService as any).prototype.generateTodayRuntime = async () => { throw new Error('boom') }

        const res = await app.inject({ method: 'GET', url: '/today/runtime' })
        expect(res.statusCode).toBe(500)
        const body = JSON.parse(res.body)
        expect(body).toHaveProperty('error', 'today_runtime_failed')

            // restore
            ; (ChiefService as any).prototype.generateTodayRuntime = orig
    })
})
