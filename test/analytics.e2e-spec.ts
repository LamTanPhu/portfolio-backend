/**
 * @fileoverview analytics.e2e-spec.ts
 *
 * Covers the three public tracking endpoints and the admin report. A
 * project-view needs a real project id to satisfy the foreign key, so this
 * file creates and cleans up one project of its own rather than depending
 * on project.e2e-spec.ts's data (spec files must not depend on each other's
 * side effects or on run order across files).
 *
 * POST /api/analytics/resume-download is throttled to 5/60s — this file
 * only calls it twice, well under budget, so no rate-limit accounting notes
 * are needed here the way auth/contact needed them.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import { createTestApp } from './utils/create-test-app'
import { api, authHeader } from './utils/http'
import { loginAsAdmin } from './utils/auth'
import { unique } from './utils/unique'

describe('Analytics (e2e)', () => {
    let app: INestApplication<Server>
    let accessToken: string
    let projectId: number
    const route = `/e2e-analytics-${Date.now()}`

    beforeAll(async () => {
        app = await createTestApp()
        ;({ accessToken } = await loginAsAdmin(app))

        const res = await api(app)
            .post('/api/projects')
            .set(...authHeader(accessToken))
            .send({
                name: unique('analytics-target-project'),
                description: 'Exists only so project-view tracking has a real id to target.',
                techStack: ['TypeScript'],
                isOpenSource: false,
            })
            .expect(201)
        projectId = (res.body as { id: number }).id
    })

    afterAll(async () => {
        await api(app)
            .delete(`/api/projects/${projectId}`)
            .set(...authHeader(accessToken))
        await app.close()
    })

    describe('POST /api/analytics/page-view', () => {
        it('rejects a route not starting with /', async () => {
            await api(app).post('/api/analytics/page-view').send({ route: 'no-leading-slash' }).expect(400)
        })

        it('rejects a route with disallowed characters', async () => {
            await api(app).post('/api/analytics/page-view').send({ route: '/Has_Underscore!' }).expect(400)
        })

        it('accepts a valid route with no auth required', async () => {
            const res = await api(app).post('/api/analytics/page-view').send({ route }).expect(201)
            expect((res.body as { success: boolean }).success).toBe(true)
        })
    })

    describe('POST /api/analytics/project-view/:id', () => {
        it('accepts a view for an existing project', async () => {
            const res = await api(app).post(`/api/analytics/project-view/${projectId}`).expect(201)
            expect((res.body as { success: boolean }).success).toBe(true)
        })
    })

    describe('POST /api/analytics/resume-download', () => {
        it('records a resume download with no auth required', async () => {
            const res = await api(app).post('/api/analytics/resume-download').expect(201)
            expect((res.body as { success: boolean }).success).toBe(true)
        })
    })

    describe('GET /api/analytics/page-views', () => {
        it('requires authentication', async () => {
            await api(app).get('/api/analytics/page-views').expect(401)
        })

        it('reflects the page view just recorded', async () => {
            const res = await api(app)
                .get('/api/analytics/page-views')
                .set(...authHeader(accessToken))
                .expect(200)

            const body = res.body as { route: string; count: number }[]
            const found = body.find((p) => p.route === route)
            expect(found).toBeDefined()
            expect(found!.count).toBeGreaterThanOrEqual(1)
        })
    })
})
