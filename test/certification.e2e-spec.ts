/**
 * @fileoverview certification.e2e-spec.ts
 *
 * CRUD coverage for the certification module. GET /api/certifications only
 * returns published ones (GetPublishedCertificationsQuery — "published
 * certifications" per its own Swagger summary), but the response DTO
 * (CertificationDTO) doesn't carry an isPublished field the way
 * blog/project/skill/social do — confirmed by reading the DTO directly, not
 * assumed. Visibility is asserted via list membership here, not a response
 * field, since there's nothing to read the field from.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import { createTestApp } from './utils/create-test-app'
import { api, authHeader } from './utils/http'
import { loginAsAdmin } from './utils/auth'
import { unique } from './utils/unique'

interface Certification {
    id: number
    name: string
    url: string
    startDate: string
    endDate: string | null
}

describe('Certification (e2e)', () => {
    let app: INestApplication<Server>
    let accessToken: string
    let published: Certification
    let draft: Certification

    beforeAll(async () => {
        app = await createTestApp()
        ;({ accessToken } = await loginAsAdmin(app))
    })

    afterAll(async () => {
        await app.close()
    })

    describe('POST /api/certifications', () => {
        it('requires authentication', async () => {
            await api(app)
                .post('/api/certifications')
                .send({ name: 'AWS', url: 'https://aws.amazon.com/verify/x', startDate: '2024-01-01' })
                .expect(401)
        })

        it('rejects an invalid credential URL', async () => {
            await api(app)
                .post('/api/certifications')
                .set(...authHeader(accessToken))
                .send({ name: unique('bad-url-cert'), url: 'not-a-url', startDate: '2024-01-01' })
                .expect(400)
        })

        it('creates a published certification', async () => {
            const name = unique('java-ee')
            const res = await api(app)
                .post('/api/certifications')
                .set(...authHeader(accessToken))
                .send({
                    name,
                    url: 'https://coursera.org/verify/abc123',
                    startDate: '2024-06-01',
                    isPublished: true,
                })
                .expect(201)

            published = res.body as Certification
            expect(published.name).toBe(name)
        })

        it('creates a draft (unpublished) certification', async () => {
            const name = unique('unlisted-cert')
            const res = await api(app)
                .post('/api/certifications')
                .set(...authHeader(accessToken))
                .send({ name, url: 'https://coursera.org/verify/def456', startDate: '2024-06-01' })
                .expect(201)

            draft = res.body as Certification
        })
    })

    describe('GET /api/certifications (public)', () => {
        it('includes the published certification but not the draft', async () => {
            const res = await api(app).get('/api/certifications').expect(200)
            const body = res.body as Certification[]

            expect(body.some((c) => c.id === published.id)).toBe(true)
            expect(body.some((c) => c.id === draft.id)).toBe(false)
        })
    })

    describe('PATCH /api/certifications/:id', () => {
        it('requires authentication', async () => {
            await api(app).patch(`/api/certifications/${draft.id}`).send({ isPublished: true }).expect(401)
        })

        it('publishing the draft makes it appear in the public list', async () => {
            await api(app)
                .patch(`/api/certifications/${draft.id}`)
                .set(...authHeader(accessToken))
                .send({ isPublished: true })
                .expect(200)

            const res = await api(app).get('/api/certifications').expect(200)
            const body = res.body as Certification[]
            expect(body.some((c) => c.id === draft.id)).toBe(true)
        })

        it('returns 404 for a non-existent certification', async () => {
            await api(app)
                .patch('/api/certifications/999999999')
                .set(...authHeader(accessToken))
                .send({ name: 'Does not matter' })
                .expect(404)
        })
    })

    describe('DELETE /api/certifications/:id', () => {
        it('requires authentication', async () => {
            await api(app).delete(`/api/certifications/${published.id}`).expect(401)
        })

        it('deletes both certifications created in this run', async () => {
            await api(app)
                .delete(`/api/certifications/${published.id}`)
                .set(...authHeader(accessToken))
                .expect(204)
            await api(app)
                .delete(`/api/certifications/${draft.id}`)
                .set(...authHeader(accessToken))
                .expect(204)
        })

        it('returns 404 when deleting an already-deleted certification', async () => {
            await api(app)
                .delete(`/api/certifications/${published.id}`)
                .set(...authHeader(accessToken))
                .expect(404)
        })
    })
})
