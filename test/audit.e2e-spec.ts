/**
 * @fileoverview audit.e2e-spec.ts
 *
 * AuditLogInterceptor writes fire-and-forget (`void this.write(...)`,
 * intentionally not awaited before the HTTP response is sent — see the
 * interceptor's own comments), so a GET /api/audit called immediately after
 * a mutation is not guaranteed to see it yet. The short delay below is a
 * pragmatic trade-off for that, not a sign of a race worth fixing — audit
 * logging staying off the response's critical path is the whole point.
 *
 * entityId is stored as a string column (schema.prisma AuditLog.entityId is
 * String?) — for POST/create routes it's resolved from the response body's
 * numeric id and stringified, so comparisons against skillId here go through
 * String(skillId) to match what actually comes back over JSON.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import { loginAsAdmin } from './utils/auth'
import { createTestApp } from './utils/create-test-app'
import { api, authHeader } from './utils/http'
import { unique } from './utils/unique'

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
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

        await wait(500)

        const res = await api(app)
            .get('/api/audit')
            .set(...authHeader(accessToken))
            .expect(200)

        const body = res.body as {
            items: { method: string; route: string; entityType: string; entityId: string | null; statusCode: number }[]
            total: number
        }

        const entry = body.items.find((e) => e.entityType === 'Skill' && e.entityId === String(skillId))
        expect(entry).toBeDefined()
        expect(entry!.method).toBe('POST')
        expect(entry!.statusCode).toBe(201)
    })

    it('does not log a failed (guard-rejected) request', async () => {
        // An unauthenticated POST never reaches the interceptor at all —
        // JwtAuthGuard rejects it first. Nothing new should appear tied to a
        // route that was never actually mutated.
        await api(app)
            .post('/api/skills')
            .send({ name: unique('unauthorized-skill'), category: 'backend' })
            .expect(401)

        await wait(300)

        const res = await api(app)
            .get('/api/audit')
            .set(...authHeader(accessToken))
            .expect(200)

        const body = res.body as {
            items: { entityId: string | null; entityType: string; method: string; route: string }[]
        }

        // Other E2E suites share the same test database, so this spec cannot
        // assume it owns every historical Skill audit row. The interceptor's
        // contract is that a guard-rejected request produces no audit entry at all.
        // An actual successful POST always has the created entity id, so a POST
        // with a null entityId on this route would prove the rejected request leaked
        // into the audit log.
        const leakedUnauthorizedEntries = body.items.filter(
            (e) => e.entityType === 'Skill' && e.method === 'POST' && e.route === '/api/skills' && e.entityId === null,
        )
        expect(leakedUnauthorizedEntries).toHaveLength(0)
    })
})
