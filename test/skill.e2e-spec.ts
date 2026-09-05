/**
 * @fileoverview skill.e2e-spec.ts
 *
 * CRUD coverage for the skill module. Unlike blog/project, there is no
 * admin-only listing endpoint here — GET /api/skills is the only read
 * endpoint and it always filters to isPublic: true (GetPublishedSkillsQuery).
 * That's an intentional API shape, not a gap: verified by reading
 * SkillController — worth testing explicitly since it's easy to assume
 * (wrongly) there's a hidden admin list like blog has.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import { createTestApp } from './utils/create-test-app'
import { api, authHeader } from './utils/http'
import { loginAsAdmin } from './utils/auth'
import { unique } from './utils/unique'

interface Skill {
    id: number
    name: string
    category: string
    isPublic: boolean
}

describe('Skill (e2e)', () => {
    let app: INestApplication<Server>
    let accessToken: string
    let publicSkill: Skill
    let privateSkill: Skill

    beforeAll(async () => {
        app = await createTestApp()
        ;({ accessToken } = await loginAsAdmin(app))
    })

    afterAll(async () => {
        await app.close()
    })

    describe('POST /api/skills', () => {
        it('requires authentication', async () => {
            await api(app).post('/api/skills').send({ name: 'Rust', category: 'backend' }).expect(401)
        })

        it('rejects an invalid category', async () => {
            await api(app)
                .post('/api/skills')
                .set(...authHeader(accessToken))
                .send({ name: unique('bad-category'), category: 'not-a-real-category' })
                .expect(400)
        })

        it('creates a public skill', async () => {
            const name = unique('typescript')
            const res = await api(app)
                .post('/api/skills')
                .set(...authHeader(accessToken))
                .send({ name, category: 'frontend', isPublic: true })
                .expect(201)

            const body = res.body as Skill
            expect(body.name).toBe(name)
            expect(body.isPublic).toBe(true)
            publicSkill = body
        })

        it('creates a private skill', async () => {
            const name = unique('cobol')
            const res = await api(app)
                .post('/api/skills')
                .set(...authHeader(accessToken))
                .send({ name, category: 'other', isPublic: false })
                .expect(201)

            privateSkill = res.body as Skill
            expect(privateSkill.isPublic).toBe(false)
        })
    })

    describe('GET /api/skills (public)', () => {
        it('includes the public skill but not the private one', async () => {
            const res = await api(app).get('/api/skills').expect(200)
            const body = res.body as Skill[]

            expect(body.some((s) => s.id === publicSkill.id)).toBe(true)
            expect(body.some((s) => s.id === privateSkill.id)).toBe(false)
        })
    })

    describe('PATCH /api/skills/:id', () => {
        it('requires authentication', async () => {
            await api(app).patch(`/api/skills/${privateSkill.id}`).send({ isPublic: true }).expect(401)
        })

        it('flipping isPublic to true makes it appear in the public list', async () => {
            await api(app)
                .patch(`/api/skills/${privateSkill.id}`)
                .set(...authHeader(accessToken))
                .send({ isPublic: true })
                .expect(200)

            const res = await api(app).get('/api/skills').expect(200)
            const body = res.body as Skill[]
            expect(body.some((s) => s.id === privateSkill.id)).toBe(true)
        })

        it('returns 404 for a non-existent skill', async () => {
            await api(app)
                .patch('/api/skills/999999999')
                .set(...authHeader(accessToken))
                .send({ name: 'Does not matter' })
                .expect(404)
        })
    })

    describe('DELETE /api/skills/:id', () => {
        it('requires authentication', async () => {
            await api(app).delete(`/api/skills/${publicSkill.id}`).expect(401)
        })

        it('deletes both skills created in this run', async () => {
            await api(app)
                .delete(`/api/skills/${publicSkill.id}`)
                .set(...authHeader(accessToken))
                .expect(204)
            await api(app)
                .delete(`/api/skills/${privateSkill.id}`)
                .set(...authHeader(accessToken))
                .expect(204)

            const res = await api(app).get('/api/skills').expect(200)
            const body = res.body as Skill[]
            expect(body.some((s) => s.id === publicSkill.id)).toBe(false)
        })

        it('returns 404 when deleting an already-deleted skill', async () => {
            await api(app)
                .delete(`/api/skills/${publicSkill.id}`)
                .set(...authHeader(accessToken))
                .expect(404)
        })
    })
})
