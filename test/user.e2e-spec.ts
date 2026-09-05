/**
 * @fileoverview user.e2e-spec.ts
 *
 * The whole UserController is behind JwtAuthGuard (class-level @UseGuards),
 * so every test here needs a token — there's no public path to cover.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import { createTestApp } from './utils/create-test-app'
import { api, authHeader } from './utils/http'
import { loginAsAdmin } from './utils/auth'
import { unique } from './utils/unique'

interface UserProfile {
    id: number
    firstname: string
    lastname: string
    email: string
    aboutme: string | null
}

describe('User (e2e)', () => {
    let app: INestApplication<Server>
    let accessToken: string
    let originalProfile: UserProfile

    beforeAll(async () => {
        app = await createTestApp()
        ;({ accessToken } = await loginAsAdmin(app))
    })

    afterAll(async () => {
        // Restore whatever the profile looked like before this file ran, so
        // repeated local runs don't accumulate drift on the one shared admin row.
        await api(app)
            .patch('/api/user/profile')
            .set(...authHeader(accessToken))
            .send({
                firstname: originalProfile.firstname,
                lastname: originalProfile.lastname,
                aboutme: originalProfile.aboutme,
            })
        await app.close()
    })

    describe('GET /api/user/profile', () => {
        it('requires authentication', async () => {
            await api(app).get('/api/user/profile').expect(401)
        })

        it('returns the profile without a password hash field', async () => {
            const res = await api(app)
                .get('/api/user/profile')
                .set(...authHeader(accessToken))
                .expect(200)

            const body = res.body as UserProfile & Record<string, unknown>
            expect(body.email).toBe(process.env.ADMIN_EMAIL)
            expect(body).not.toHaveProperty('hashPassword')
            expect(body).not.toHaveProperty('hash_password')
            originalProfile = body
        })
    })

    describe('PATCH /api/user/profile', () => {
        it('requires authentication', async () => {
            await api(app).patch('/api/user/profile').send({ firstname: 'Nope' }).expect(401)
        })

        it('updates the bio and it is reflected on the next GET', async () => {
            const aboutme = unique('bio')

            const patchRes = await api(app)
                .patch('/api/user/profile')
                .set(...authHeader(accessToken))
                .send({ aboutme })
                .expect(200)

            expect((patchRes.body as UserProfile).aboutme).toBe(aboutme)

            const getRes = await api(app)
                .get('/api/user/profile')
                .set(...authHeader(accessToken))
                .expect(200)
            expect((getRes.body as UserProfile).aboutme).toBe(aboutme)
        })

        it('rejects a firstname longer than 45 characters', async () => {
            await api(app)
                .patch('/api/user/profile')
                .set(...authHeader(accessToken))
                .send({ firstname: 'x'.repeat(46) })
                .expect(400)
        })
    })
})
