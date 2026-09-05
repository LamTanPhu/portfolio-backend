/**
 * @fileoverview health.e2e-spec.ts
 *
 * First real end-to-end test — deliberately kept small. Its job is to prove
 * the e2e pipeline itself works (app boots, connects to a real Postgres
 * instance, migrations have run, routing/prefix is correct) rather than to
 * cover every endpoint. GET /api/health is the natural first target: it's
 * public (no JWT needed) and its whole job is reporting "is the DB actually
 * reachable" — exactly what an e2e run should confirm that unit tests,
 * which mock every repository, cannot.
 *
 * Now uses the shared createTestApp() helper (see test/utils/create-test-app.ts)
 * so every spec in the suite boots identically to production's main.ts.
 */

import type { INestApplication } from '@nestjs/common'
import type { HealthCheckResult } from '@nestjs/terminus'
import type { Server } from 'http'
import { createTestApp } from './utils/create-test-app'
import { api } from './utils/http'

describe('Health (e2e)', () => {
    let app: INestApplication<Server>

    beforeAll(async () => {
        app = await createTestApp()
    })

    afterAll(async () => {
        await app.close()
    })

    it('GET /api/health returns 200 when the database is reachable', async () => {
        const res = await api(app).get('/api/health').expect(200)

        // supertest's Response.body is typed `any` in superagent's own
        // definitions — casting against the endpoint's real contract
        // (HealthCheckResult from @nestjs/terminus) is what actually removes
        // the unsafe-member-access flag, rather than just silencing it.
        const body = res.body as HealthCheckResult
        expect(body.status).toBe('ok')
    })
})
