/**
 * @fileoverview job.e2e-spec.ts
 *
 * CRUD coverage for the job/work-experience module. No isPublic/isPublished
 * concept here at all (confirmed by reading job.dto.ts and JobController) —
 * GET /api/jobs is public and unconditionally returns every record. Dates
 * are validated as ISO 8601 strings via @IsDateString.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import { createTestApp } from './utils/create-test-app'
import { api, authHeader } from './utils/http'
import { loginAsAdmin } from './utils/auth'
import { unique } from './utils/unique'

interface Job {
    id: number
    companyName: string
    role: string
    isEnded: boolean
}

describe('Job (e2e)', () => {
    let app: INestApplication<Server>
    let accessToken: string
    let job: Job

    beforeAll(async () => {
        app = await createTestApp()
        ;({ accessToken } = await loginAsAdmin(app))
    })

    afterAll(async () => {
        await app.close()
    })

    describe('POST /api/jobs', () => {
        it('requires authentication', async () => {
            await api(app)
                .post('/api/jobs')
                .send({ companyName: 'Acme', role: 'Engineer', startedAt: '2024-01-01' })
                .expect(401)
        })

        it('rejects a malformed startedAt date', async () => {
            await api(app)
                .post('/api/jobs')
                .set(...authHeader(accessToken))
                .send({ companyName: unique('bad-date-co'), role: 'Engineer', startedAt: 'not-a-date' })
                .expect(400)
        })

        it('creates a job record', async () => {
            const companyName = unique('tab-holding')
            const res = await api(app)
                .post('/api/jobs')
                .set(...authHeader(accessToken))
                .send({ companyName, role: 'Software Developer', startedAt: '2024-08-01', isEnded: false })
                .expect(201)

            job = res.body as Job
            expect(job.companyName).toBe(companyName)
            expect(job.isEnded).toBe(false)
        })
    })

    describe('GET /api/jobs (public)', () => {
        it('includes the created job with no auth required', async () => {
            const res = await api(app).get('/api/jobs').expect(200)
            const body = res.body as Job[]
            expect(body.some((j) => j.id === job.id)).toBe(true)
        })
    })

    describe('PATCH /api/jobs/:id', () => {
        it('requires authentication', async () => {
            await api(app).patch(`/api/jobs/${job.id}`).send({ isEnded: true }).expect(401)
        })

        it('marks the job as ended', async () => {
            const res = await api(app)
                .patch(`/api/jobs/${job.id}`)
                .set(...authHeader(accessToken))
                .send({ isEnded: true, endedAt: '2025-01-01' })
                .expect(200)

            expect((res.body as Job).isEnded).toBe(true)
        })

        it('returns 404 for a non-existent job', async () => {
            await api(app)
                .patch('/api/jobs/999999999')
                .set(...authHeader(accessToken))
                .send({ role: 'Does not matter' })
                .expect(404)
        })
    })

    describe('DELETE /api/jobs/:id', () => {
        it('requires authentication', async () => {
            await api(app).delete(`/api/jobs/${job.id}`).expect(401)
        })

        it('deletes the job', async () => {
            await api(app)
                .delete(`/api/jobs/${job.id}`)
                .set(...authHeader(accessToken))
                .expect(204)

            const res = await api(app).get('/api/jobs').expect(200)
            const body = res.body as Job[]
            expect(body.some((j) => j.id === job.id)).toBe(false)
        })

        it('returns 404 when deleting an already-deleted job', async () => {
            await api(app)
                .delete(`/api/jobs/${job.id}`)
                .set(...authHeader(accessToken))
                .expect(404)
        })
    })
})
