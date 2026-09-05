/**
 * @fileoverview social.e2e-spec.ts
 *
 * CRUD coverage for the social account module. Same shape as skill: one
 * public GET filtered by isPublic, no admin-only listing endpoint.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import { createTestApp } from './utils/create-test-app'
import { api, authHeader } from './utils/http'
import { loginAsAdmin } from './utils/auth'
import { unique } from './utils/unique'

interface SocialAccount {
    id: number
    name: string
    url: string
    isPublic: boolean
}

describe('Social Account (e2e)', () => {
    let app: INestApplication<Server>
    let accessToken: string
    let publicAccount: SocialAccount
    let privateAccount: SocialAccount

    beforeAll(async () => {
        app = await createTestApp()
        ;({ accessToken } = await loginAsAdmin(app))
    })

    afterAll(async () => {
        await app.close()
    })

    describe('POST /api/social', () => {
        it('requires authentication', async () => {
            await api(app).post('/api/social').send({ name: 'GitHub', url: 'https://github.com/x' }).expect(401)
        })

        it('rejects an invalid URL', async () => {
            await api(app)
                .post('/api/social')
                .set(...authHeader(accessToken))
                .send({ name: unique('bad-url'), url: 'not-a-url' })
                .expect(400)
        })

        it('creates a public social account', async () => {
            const name = unique('github')
            const res = await api(app)
                .post('/api/social')
                .set(...authHeader(accessToken))
                .send({ name, url: 'https://github.com/example', isPublic: true })
                .expect(201)

            publicAccount = res.body as SocialAccount
            expect(publicAccount.name).toBe(name)
        })

        it('creates a private social account', async () => {
            const name = unique('scratch-account')
            const res = await api(app)
                .post('/api/social')
                .set(...authHeader(accessToken))
                .send({ name, url: 'https://example.com/private', isPublic: false })
                .expect(201)

            privateAccount = res.body as SocialAccount
        })
    })

    describe('GET /api/social (public)', () => {
        it('includes the public account but not the private one', async () => {
            const res = await api(app).get('/api/social').expect(200)
            const body = res.body as SocialAccount[]

            expect(body.some((s) => s.id === publicAccount.id)).toBe(true)
            expect(body.some((s) => s.id === privateAccount.id)).toBe(false)
        })
    })

    describe('PATCH /api/social/:id', () => {
        it('requires authentication', async () => {
            await api(app).patch(`/api/social/${publicAccount.id}`).send({ name: 'New Name' }).expect(401)
        })

        it('updates the URL', async () => {
            const res = await api(app)
                .patch(`/api/social/${publicAccount.id}`)
                .set(...authHeader(accessToken))
                .send({ url: 'https://github.com/updated-example' })
                .expect(200)

            expect((res.body as SocialAccount).url).toBe('https://github.com/updated-example')
        })

        it('returns 404 for a non-existent account', async () => {
            await api(app)
                .patch('/api/social/999999999')
                .set(...authHeader(accessToken))
                .send({ name: 'Does not matter' })
                .expect(404)
        })
    })

    describe('DELETE /api/social/:id', () => {
        it('requires authentication', async () => {
            await api(app).delete(`/api/social/${publicAccount.id}`).expect(401)
        })

        it('deletes both accounts created in this run', async () => {
            await api(app)
                .delete(`/api/social/${publicAccount.id}`)
                .set(...authHeader(accessToken))
                .expect(204)
            await api(app)
                .delete(`/api/social/${privateAccount.id}`)
                .set(...authHeader(accessToken))
                .expect(204)
        })

        it('returns 404 when deleting an already-deleted account', async () => {
            await api(app)
                .delete(`/api/social/${publicAccount.id}`)
                .set(...authHeader(accessToken))
                .expect(404)
        })
    })
})
