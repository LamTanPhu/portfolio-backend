/**
 * @fileoverview audit.e2e-spec.ts
 *
 * AuditLogInterceptor writes fire-and-forget (`void this.write(...)`,
 * intentionally not awaited before the HTTP response is sent — see the
 * interceptor's own comments), so a GET /api/audit called immediately after
 * a mutation is not guaranteed to see it yet. Polling (rather than a fixed
 * delay) is used below specifically because that write's actual latency is
 * not bounded — it varies with DB load — so any fixed wait is inherently a
 * race, just a smaller or larger one.
 *
 * entityId is stored as a string column (schema.prisma AuditLog.entityId is
 * String?) — for POST/create routes it's resolved from the response body's
 * numeric id and stringified, so comparisons against skillId here go through
 * String(skillId) to match what actually comes back over JSON.
 *
 * The second test checks for the specific failed request (route + status),
 * not "every Skill entry belongs to skillId" — this suite runs concurrently
 * alongside skill.e2e-spec.ts against the same live server/DB, which creates
 * and deletes its own Skill entities independently. An assumption of
 * exclusive access to the Skill audit trail is false under that concurrency,
 * regardless of what this suite itself does.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import { createTestApp } from './utils/create-test-app'
import { api, authHeader } from './utils/http'
import { loginAsAdmin } from './utils/auth'
import { unique } from './utils/unique'

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Polls `fn` until it returns a truthy value or `timeoutMs` elapses.
 * Used for asserting on the fire-and-forget audit write, whose completion
 * time isn't bounded by the HTTP response — a fixed wait() is a race no
 * matter the duration chosen, just a bigger or smaller one.
 */
async function waitFor<T>(fn: () => Promise<T | undefined>, timeoutMs = 5000, intervalMs = 150): Promise<T> {
    const start = Date.now()
    for (;;) {
        const result = await fn()
        if (result !== undefined) return result
        if (Date.now() - start >= timeoutMs) {
            throw new Error(`waitFor: condition not met within ${timeoutMs}ms`)
        }
        await wait(intervalMs)
    }
}

describe('Audit (e2e)', () => {
    let app: INestApplication<Server>
    let accessToken: string
    let skillId: number

    beforeAll(async () => {
        app = await createTestApp()
        ;({ accessToken } = await loginAsAdmin(app))
    })

    afterAll(async () => {
        if (skillId) {
            await api(app)
                .delete(`/api/skills/${skillId}`)
                .set(...authHeader(accessToken))
        }
        await app.close()
    })

    it('GET /api/audit requires authentication', async () => {
        await api(app).get('/api/audit').expect(401)
    })

    it('records a successful admin mutation and surfaces it in the log', async () => {
        const name = unique('audited-skill')

        const createRes = await api(app)
            .post('/api/skills')
            .set(...authHeader(accessToken))
            .send({ name, category: 'backend', isPublic: true })
            .expect(201)
        skillId = (createRes.body as { id: number }).id

        interface AuditEntry {
            method: string
            route: string
            entityType: string
            entityId: string | null
            statusCode: number
        }

        const entry = await waitFor<AuditEntry>(async () => {
            const res = await api(app)
                .get('/api/audit')
                .set(...authHeader(accessToken))
                .expect(200)

            const body = res.body as { items: AuditEntry[]; total: number }
            return body.items.find((e) => e.entityType === 'Skill' && e.entityId === String(skillId))
        })

        expect(entry.method).toBe('POST')
        expect(entry.statusCode).toBe(201)
    })

    it('does not log a failed (guard-rejected) request', async () => {
        // An unauthenticated POST never reaches the interceptor at all —
        // JwtAuthGuard rejects it first. This checks specifically that the
        // failed attempt itself never got logged, rather than asserting
        // something about every Skill entry currently in the log — this
        // suite runs concurrently with skill.e2e-spec.ts, which creates and
        // deletes its own Skill rows against the same server/DB.
        await api(app)
            .post('/api/skills')
            .send({ name: unique('unauthorized-skill'), category: 'backend' })
            .expect(401)

        await wait(300)

        const res = await api(app)
            .get('/api/audit')
            .set(...authHeader(accessToken))
            .expect(200)

        const body = res.body as { items: { route: string; statusCode: number }[] }
        const loggedTheFailedAttempt = body.items.some((e) => e.route === '/api/skills' && e.statusCode === 401)
        expect(loggedTheFailedAttempt).toBe(false)
    })
})
