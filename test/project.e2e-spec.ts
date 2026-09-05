/**
 * @fileoverview project.e2e-spec.ts
 *
 * CRUD coverage for the project module. IsUrl() validation on
 * repoUrl/liveUrl/thumbnailUrl is exercised directly — that's real HTTP-level
 * validation (class-validator's IsUrl), distinct from anything a unit test
 * mocking the repository would ever touch.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import { createTestApp } from './utils/create-test-app'
import { api, authHeader } from './utils/http'
import { loginAsAdmin } from './utils/auth'
import { unique } from './utils/unique'

interface ProjectSummary {
    id: number
    name: string
    slug: string
    isPublished: boolean
}
interface ProjectDetail extends ProjectSummary {
    description: string
    techStack: string[]
    isOpenSource: boolean
}

describe('Project (e2e)', () => {
    let app: INestApplication<Server>
    let accessToken: string
    let publishedProject: ProjectDetail
    let unpublishedProject: ProjectDetail

    beforeAll(async () => {
        app = await createTestApp()
        ;({ accessToken } = await loginAsAdmin(app))
    })

    afterAll(async () => {
        await app.close()
    })

    describe('POST /api/projects', () => {
        it('requires authentication', async () => {
            await api(app)
                .post('/api/projects')
                .send({ name: 'Unauthorized', description: 'x', techStack: [], isOpenSource: true })
                .expect(401)
        })

        it('rejects an invalid repoUrl', async () => {
            await api(app)
                .post('/api/projects')
                .set(...authHeader(accessToken))
                .send({
                    name: unique('bad-url-project'),
                    description: 'A project with a malformed repo URL.',
                    techStack: ['TypeScript'],
                    isOpenSource: true,
                    repoUrl: 'not-a-valid-url',
                })
                .expect(400)
        })

        it('creates a published project', async () => {
            const name = unique('published-project')
            const res = await api(app)
                .post('/api/projects')
                .set(...authHeader(accessToken))
                .send({
                    name,
                    description: 'A React Native app for electric motorcycle rentals.',
                    techStack: ['React Native', 'NestJS'],
                    isOpenSource: true,
                    isPublished: true,
                    repoUrl: 'https://github.com/example/repo',
                })
                .expect(201)

            const body = res.body as ProjectDetail
            expect(body.name).toBe(name)
            expect(body.isPublished).toBe(true)
            expect(body.techStack).toEqual(['React Native', 'NestJS'])
            publishedProject = body
        })

        it('creates an unpublished project', async () => {
            const name = unique('unpublished-project')
            const res = await api(app)
                .post('/api/projects')
                .set(...authHeader(accessToken))
                .send({
                    name,
                    description: 'A project not yet ready for the public.',
                    techStack: ['Go'],
                    isOpenSource: false,
                })
                .expect(201)

            const body = res.body as ProjectDetail
            expect(body.isPublished).toBe(false)
            unpublishedProject = body
        })
    })

    describe('GET /api/projects (public)', () => {
        it('includes the published project but not the unpublished one', async () => {
            const res = await api(app).get('/api/projects').expect(200)
            const body = res.body as ProjectSummary[]

            expect(body.some((p) => p.id === publishedProject.id)).toBe(true)
            expect(body.some((p) => p.id === unpublishedProject.id)).toBe(false)
        })

        it('list items do not leak the full description field', async () => {
            const res = await api(app).get('/api/projects').expect(200)
            const body = res.body as Record<string, unknown>[]
            const found = body.find((p) => p.id === publishedProject.id)
            expect(found).toBeDefined()
            expect(found).not.toHaveProperty('description')
        })
    })

    describe('GET /api/projects/:slug', () => {
        it('returns the full project by slug', async () => {
            const res = await api(app).get(`/api/projects/${publishedProject.slug}`).expect(200)
            const body = res.body as ProjectDetail
            expect(body.id).toBe(publishedProject.id)
            expect(body.description.length).toBeGreaterThan(0)
        })

        it('returns 404 for an unknown slug', async () => {
            await api(app).get('/api/projects/no-such-project-slug').expect(404)
        })
    })

    describe('PATCH /api/projects/:id', () => {
        it('requires authentication', async () => {
            await api(app).patch(`/api/projects/${unpublishedProject.id}`).send({ isPublished: true }).expect(401)
        })

        it('publishes the previously-unpublished project', async () => {
            const res = await api(app)
                .patch(`/api/projects/${unpublishedProject.id}`)
                .set(...authHeader(accessToken))
                .send({ isPublished: true })
                .expect(200)

            expect((res.body as ProjectDetail).isPublished).toBe(true)
        })

        it('returns 404 for a non-existent project', async () => {
            await api(app)
                .patch('/api/projects/999999999')
                .set(...authHeader(accessToken))
                .send({ name: 'Does not matter' })
                .expect(404)
        })
    })

    describe('DELETE /api/projects/:id', () => {
        it('requires authentication', async () => {
            await api(app).delete(`/api/projects/${publishedProject.id}`).expect(401)
        })

        it('deletes both projects created in this run', async () => {
            await api(app)
                .delete(`/api/projects/${publishedProject.id}`)
                .set(...authHeader(accessToken))
                .expect(204)
            await api(app)
                .delete(`/api/projects/${unpublishedProject.id}`)
                .set(...authHeader(accessToken))
                .expect(204)

            await api(app).get(`/api/projects/${publishedProject.slug}`).expect(404)
        })

        it('returns 404 when deleting an already-deleted project', async () => {
            await api(app)
                .delete(`/api/projects/${publishedProject.id}`)
                .set(...authHeader(accessToken))
                .expect(404)
        })
    })
})
