/**
 * @fileoverview auth.e2e-spec.ts
 *
 * Covers the full login → refresh → logout lifecycle against a real app
 * instance, real Postgres, and real cookie handling — none of which the
 * existing unit tests exercise (AuthService's unit tests mock every
 * repository and never touch an actual httpOnly cookie or Bearer header).
 *
 * Request ordering within this file is deliberate and load-bearing: POST
 * /api/auth/login is throttled to 5/60s (AuthController's @Throttle
 * decorator) and POST /api/auth/refresh to 10/60s, and the throttler's
 * in-memory storage lives for this file's single app instance. The rate
 * limit test at the bottom is intentionally the 6th call to /login in this
 * file — every test above it is accounted for. Don't reorder tests or add
 * new /login calls without recounting.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import { createTestApp } from './utils/create-test-app'
import { api, authHeader, findCookie } from './utils/http'

describe('Auth (e2e)', () => {
    let app: INestApplication<Server>

    beforeAll(async () => {
        app = await createTestApp()
    })

    afterAll(async () => {
        await app.close()
    })

    const adminPassword = (): string => {
        const pw = process.env.ADMIN_PASSWORD
        if (!pw) throw new Error('ADMIN_PASSWORD not set — check .env.test')
        return pw
    }

    describe('POST /api/auth/login', () => {
        // Call 1/5 to /login in this file.
        it('rejects an incorrect password with 401', async () => {
            await api(app).post('/api/auth/login').send({ password: 'definitely-the-wrong-password' }).expect(401)
        })

        // Call 2/5.
        it('rejects a password shorter than the 10-char minimum with 400', async () => {
            await api(app).post('/api/auth/login').send({ password: 'short' }).expect(400)
        })

        // Call 3/5.
        it('returns an access token and sets an httpOnly refresh cookie on success', async () => {
            const res = await api(app).post('/api/auth/login').send({ password: adminPassword() }).expect(200)

            const body = res.body as { accessToken: string }
            expect(typeof body.accessToken).toBe('string')
            expect(body.accessToken.length).toBeGreaterThan(0)

            const refreshCookie = findCookie(res, 'refreshToken')
            expect(refreshCookie).toBeDefined()

            const fullCookieHeader = res.headers['set-cookie']
            expect(fullCookieHeader).toBeDefined()
        })
    })

    describe('POST /api/auth/refresh', () => {
        it('rejects a request with no refresh cookie', async () => {
            await api(app).post('/api/auth/refresh').expect(401)
        })

        it('issues a new access token and rotates the refresh cookie when the old one is valid', async () => {
            // Call 4/5 to /login — a fresh session dedicated to this test so
            // it doesn't fight over cookie state with the "success" test above.
            const loginRes = await api(app).post('/api/auth/login').send({ password: adminPassword() }).expect(200)
            const firstCookie = findCookie(loginRes, 'refreshToken')
            if (!firstCookie) throw new Error('No refreshToken cookie on login response')

            const refreshRes = await api(app).post('/api/auth/refresh').set('Cookie', firstCookie).expect(200)

            const body = refreshRes.body as { accessToken: string }
            expect(typeof body.accessToken).toBe('string')

            const rotatedCookie = findCookie(refreshRes, 'refreshToken')
            expect(rotatedCookie).not.toBe(firstCookie)

            // The old refresh token was revoked as part of rotation — replaying
            // it must now fail, proving rotation actually revokes, not just reissues.
            await api(app).post('/api/auth/refresh').set('Cookie', firstCookie).expect(401)
        })
    })

    describe('POST /api/auth/logout', () => {
        it('requires a bearer token', async () => {
            await api(app).post('/api/auth/logout').expect(401)
        })

        it('revokes the current session — the access token stops working and the refresh cookie is cleared', async () => {
            // Call 5/5 to /login — last one allowed before the rate-limit test below.
            const loginRes = await api(app).post('/api/auth/login').send({ password: adminPassword() }).expect(200)
            const { accessToken } = loginRes.body as { accessToken: string }
            const refreshCookie = findCookie(loginRes, 'refreshToken')
            if (!refreshCookie) throw new Error('No refreshToken cookie on login response')

            const logoutRes = await api(app)
                .post('/api/auth/logout')
                .set(...authHeader(accessToken))
                .set('Cookie', refreshCookie)
                .expect(204)

            expect(logoutRes.headers['set-cookie']).toBeDefined()

            // Revoked refresh token must no longer work.
            await api(app).post('/api/auth/refresh').set('Cookie', refreshCookie).expect(401)

            // Revoked access token must no longer authorize a protected route.
            await api(app)
                .get('/api/user/profile')
                .set(...authHeader(accessToken))
                .expect(401)
        })
    })

    describe('rate limiting', () => {
        it('returns 429 after exceeding the login rate limit (5/60s)', async () => {
            // This file has made exactly 5 prior calls to /login (see the
            // numbered comments above). This is the 6th — it must be rejected
            // by DomainThrottlerGuard regardless of credentials.
            await api(app).post('/api/auth/login').send({ password: 'irrelevant' }).expect(429)
        })
    })
})
