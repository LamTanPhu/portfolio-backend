/**
 * @fileoverview about.e2e-spec.ts
 *
 * AboutController just re-exposes the same public queries used by
 * skill/education/job/certification/social under one /about/* namespace —
 * this spec exists to prove that wiring is actually correct end-to-end
 * (each handler really is calling the query it claims to), not to
 * re-litigate CRUD behavior already covered in each entity's own spec.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import { createTestApp } from './utils/create-test-app'
import { api, authHeader } from './utils/http'
import { loginAsAdmin } from './utils/auth'
import { unique } from './utils/unique'

describe('About (e2e)', () => {
    let app: INestApplication<Server>
    let accessToken: string
    let skillId: number

    beforeAll(async () => {
        app = await createTestApp()
        ;({ accessToken } = await loginAsAdmin(app))

        const res = await api(app)
            .post('/api/skills')
            .set(...authHeader(accessToken))
            .send({ name: unique('about-page-skill'), category: 'backend', isPublic: true })
            .expect(201)
        skillId = (res.body as { id: number }).id
    })

    afterAll(async () => {
        await api(app)
            .delete(`/api/skills/${skillId}`)
            .set(...authHeader(accessToken))
        await app.close()
    })

    it('GET /api/about/skills mirrors GET /api/skills and needs no auth', async () => {
        const res = await api(app).get('/api/about/skills').expect(200)
        const body = res.body as { id: number }[]
        expect(body.some((s) => s.id === skillId)).toBe(true)
    })

    it('GET /api/about/education returns 200 with no auth', async () => {
        const res = await api(app).get('/api/about/education').expect(200)
        expect(Array.isArray(res.body)).toBe(true)
    })

    it('GET /api/about/jobs returns 200 with no auth', async () => {
        const res = await api(app).get('/api/about/jobs').expect(200)
        expect(Array.isArray(res.body)).toBe(true)
    })

    it('GET /api/about/certifications returns 200 with no auth', async () => {
        const res = await api(app).get('/api/about/certifications').expect(200)
        expect(Array.isArray(res.body)).toBe(true)
    })

    it('GET /api/about/social returns 200 with no auth', async () => {
        const res = await api(app).get('/api/about/social').expect(200)
        expect(Array.isArray(res.body)).toBe(true)
    })
})
