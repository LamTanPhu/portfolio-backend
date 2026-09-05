/**
 * @fileoverview education.e2e-spec.ts
 *
 * CRUD coverage for the education module — same shape as job: public,
 * unfiltered GET, ISO 8601 date validation.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import { createTestApp } from './utils/create-test-app'
import { api, authHeader } from './utils/http'
import { loginAsAdmin } from './utils/auth'
import { unique } from './utils/unique'

interface Education {
    id: number
    degreeName: string
    instituteName: string
    isCompleted: boolean
}

describe('Education (e2e)', () => {
    let app: INestApplication<Server>
    let accessToken: string
    let record: Education

    beforeAll(async () => {
        app = await createTestApp()
        ;({ accessToken } = await loginAsAdmin(app))
    })

    afterAll(async () => {
        await app.close()
    })

    describe('POST /api/education', () => {
        it('requires authentication', async () => {
            await api(app)
                .post('/api/education')
                .send({ degreeName: 'BSc', instituteName: 'Some University', startedAt: '2022-09-01' })
                .expect(401)
        })

        it('rejects a malformed startedAt date', async () => {
            await api(app)
                .post('/api/education')
                .set(...authHeader(accessToken))
                .send({
                    degreeName: unique('bad-date-degree'),
                    instituteName: 'Some University',
                    startedAt: 'not-a-date',
                })
                .expect(400)
        })

        it('creates an education record', async () => {
            const degreeName = unique('software-engineering')
            const res = await api(app)
                .post('/api/education')
                .set(...authHeader(accessToken))
                .send({
                    degreeName,
                    instituteName: 'FPT University',
                    startedAt: '2022-09-01',
                    isCompleted: false,
                })
                .expect(201)

            record = res.body as Education
            expect(record.degreeName).toBe(degreeName)
            expect(record.isCompleted).toBe(false)
        })
    })

    describe('GET /api/education (public)', () => {
        it('includes the created record with no auth required', async () => {
            const res = await api(app).get('/api/education').expect(200)
            const body = res.body as Education[]
            expect(body.some((e) => e.id === record.id)).toBe(true)
        })
    })

    describe('PATCH /api/education/:id', () => {
        it('requires authentication', async () => {
            await api(app).patch(`/api/education/${record.id}`).send({ isCompleted: true }).expect(401)
        })

        it('marks the degree as completed', async () => {
            const res = await api(app)
                .patch(`/api/education/${record.id}`)
                .set(...authHeader(accessToken))
                .send({ isCompleted: true, endedAt: '2026-01-15' })
                .expect(200)

            expect((res.body as Education).isCompleted).toBe(true)
        })

        it('returns 404 for a non-existent record', async () => {
            await api(app)
                .patch('/api/education/999999999')
                .set(...authHeader(accessToken))
                .send({ degreeName: 'Does not matter' })
                .expect(404)
        })
    })

    describe('DELETE /api/education/:id', () => {
        it('requires authentication', async () => {
            await api(app).delete(`/api/education/${record.id}`).expect(401)
        })

        it('deletes the record', async () => {
            await api(app)
                .delete(`/api/education/${record.id}`)
                .set(...authHeader(accessToken))
                .expect(204)

            const res = await api(app).get('/api/education').expect(200)
            const body = res.body as Education[]
            expect(body.some((e) => e.id === record.id)).toBe(false)
        })

        it('returns 404 when deleting an already-deleted record', async () => {
            await api(app)
                .delete(`/api/education/${record.id}`)
                .set(...authHeader(accessToken))
                .expect(404)
        })
    })
})
