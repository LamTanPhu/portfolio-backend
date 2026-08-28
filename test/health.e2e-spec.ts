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
 * More e2e specs (auth login/refresh/logout flow, contact form submission)
 * should be added over time using this file as the template.
 */

import type { INestApplication } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { HealthCheckResult } from '@nestjs/terminus'
import type { Server } from 'http'
import request from 'supertest'
import { AppModule } from '../src/app.module'

describe('Health (e2e)', () => {
    // INestApplication<TServer> defaults TServer to `any` when
    // unparameterized, which is exactly why getHttpServer() below was
    // untyped. This app runs on @nestjs/platform-express, so the real
    // runtime value is a Node http.Server — naming that here instead of
    // taking the `any` default removes the unsafe-argument warning at
    // its source rather than casting or suppressing it at the call site.
    let app: INestApplication<Server>

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile()

        app = moduleFixture.createNestApplication()

        // Mirrors main.ts — routes are only reachable under /api in the
        // real app, so the test needs the same prefix or every request
        // below would 404 against the bare path.
        app.setGlobalPrefix('api')

        await app.init()
    })

    afterAll(async () => {
        await app.close()
    })

    it('GET /api/health returns 200 when the database is reachable', () => {
        return request(app.getHttpServer())
            .get('/api/health')
            .expect(200)
            .expect((res) => {
                // supertest's Response.body is typed `any` in superagent's
                // own definitions (a known gap, not something we can fix
                // here) — casting against the endpoint's real contract
                // (HealthCheckResult from @nestjs/terminus, the same type
                // HealthController's return value resolves to) is what
                // actually removes the unsafe-member-access flag, rather
                // than just silencing it.
                const body = res.body as HealthCheckResult
                expect(body.status).toBe('ok')
            })
    })
})
