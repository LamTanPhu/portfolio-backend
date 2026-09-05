/**
 * @fileoverview contact.e2e-spec.ts
 *
 * Covers the public submission path (guarded by TurnstileGuard, throttled
 * 3/60s) and the admin list/delete path (JwtAuthGuard). The real
 * TurnstileVerifier is swapped for StubTurnstileVerifier in createTestApp(),
 * so "invalid token" here means the sentinel INVALID_TURNSTILE_TOKEN value,
 * not a real failed Cloudflare call.
 *
 * Request ordering matters: POST /api/contact is throttled to 3/60s
 * (ContactController's @Throttle), and every call to it — successful or
 * not — consumes one slot, because DomainThrottlerGuard (global) runs
 * before TurnstileGuard (route-level), so even a guard-rejected request
 * counts. This file makes exactly 3 calls to that route before the
 * dedicated rate-limit test below, which is deliberately the 4th.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import { createTestApp } from './utils/create-test-app'
import { api, authHeader } from './utils/http'
import { loginAsAdmin } from './utils/auth'
import { INVALID_TURNSTILE_TOKEN } from './utils/stub-turnstile-verifier'

describe('Contact (e2e)', () => {
    let app: INestApplication<Server>
    let createdMessageId: number

    beforeAll(async () => {
        app = await createTestApp()
    })

    afterAll(async () => {
        await app.close()
    })

    describe('POST /api/contact', () => {
        // Call 1/3.
        it('rejects a submission with no Turnstile token with 400', async () => {
            await api(app)
                .post('/api/contact')
                .send({ name: 'Jane Doe', email: 'jane@example.com', message: 'Hello there, this is a test message.' })
                .expect(400)
        })

        // Call 2/3.
        it('rejects a submission with a failed Turnstile verification with 400', async () => {
            await api(app)
                .post('/api/contact')
                .send({
                    name: 'Jane Doe',
                    email: 'jane@example.com',
                    message: 'Hello there, this is a test message.',
                    turnstileToken: INVALID_TURNSTILE_TOKEN,
                })
                .expect(400)
        })

        // Call 3/3 — the last allowed call before this file's throttle window fills.
        it('accepts a valid submission and returns 201', async () => {
            const res = await api(app)
                .post('/api/contact')
                .send({
                    name: 'Jane Doe',
                    email: 'e2e-contact@example.com',
                    message: 'Hello there, this is a genuinely valid test message.',
                    turnstileToken: 'any-non-sentinel-token',
                })
                .expect(201)

            const body = res.body as { success: boolean }
            expect(body.success).toBe(true)
        })
    })

    describe('rate limiting', () => {
        // Call 4/3 — over budget by design. Guards run before the
        // ValidationPipe, so this returns 429 even with a well-formed body.
        it('returns 429 after exceeding the contact-form rate limit (3/60s)', async () => {
            await api(app)
                .post('/api/contact')
                .send({
                    name: 'Jane Doe',
                    email: 'jane@example.com',
                    message: 'Hello there, this is a test message.',
                    turnstileToken: 'any-non-sentinel-token',
                })
                .expect(429)
        })
    })

    describe('admin contact management', () => {
        it('GET /api/contact requires authentication', async () => {
            await api(app).get('/api/contact').expect(401)
        })

        it('DELETE /api/contact/:id requires authentication', async () => {
            await api(app).delete('/api/contact/999999').expect(401)
        })

        it('lists the submitted message once authenticated', async () => {
            const { accessToken } = await loginAsAdmin(app)

            const res = await api(app)
                .get('/api/contact')
                .set(...authHeader(accessToken))
                .expect(200)

            const body = res.body as { items: { id: number; email: string }[]; total: number }
            const found = body.items.find((m) => m.email === 'e2e-contact@example.com')
            expect(found).toBeDefined()
            createdMessageId = found!.id
        })

        it('returns 404 when deleting a message that does not exist', async () => {
            const { accessToken } = await loginAsAdmin(app)

            await api(app)
                .delete('/api/contact/999999999')
                .set(...authHeader(accessToken))
                .expect(404)
        })

        it('deletes the message and it no longer appears in the list', async () => {
            const { accessToken } = await loginAsAdmin(app)

            await api(app)
                .delete(`/api/contact/${createdMessageId}`)
                .set(...authHeader(accessToken))
                .expect(204)

            const res = await api(app)
                .get('/api/contact')
                .set(...authHeader(accessToken))
                .expect(200)

            const body = res.body as { items: { id: number }[] }
            expect(body.items.find((m) => m.id === createdMessageId)).toBeUndefined()
        })
    })
})
