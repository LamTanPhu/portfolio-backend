/**
 * @fileoverview blog.e2e-spec.ts
 *
 * Full CRUD + search coverage for the blog module — the richest module in
 * the codebase (draft/publish state, tags, full-text search).
 *
 * The search test here is exactly what caught the search_vector bug: with
 * no trigger populating blogs.search_vector (fixed in migration
 * 20260903120000_blog_search_vector), this test would have failed forever —
 * a published post, searched by its own exact title, returning zero results.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import { createTestApp } from './utils/create-test-app'
import { api, authHeader } from './utils/http'
import { loginAsAdmin } from './utils/auth'
import { unique } from './utils/unique'

interface BlogSummary {
    id: number
    title: string
    slug: string
    isPublished: boolean
}
interface BlogDetail extends BlogSummary {
    content: string
    excerpt: string | null
    tags: string[]
}

describe('Blog (e2e)', () => {
    let app: INestApplication<Server>
    let accessToken: string

    beforeAll(async () => {
        app = await createTestApp()
        ;({ accessToken } = await loginAsAdmin(app))
    })

    afterAll(async () => {
        await app.close()
    })

    describe('POST /api/blogs', () => {
        it('requires authentication', async () => {
            await api(app)
                .post('/api/blogs')
                .send({ title: 'Unauthorized Post', content: 'Should not be created.' })
                .expect(401)
        })

        it('rejects a body with an empty title', async () => {
            await api(app)
                .post('/api/blogs')
                .set(...authHeader(accessToken))
                .send({ title: '', content: 'Some content that is long enough.' })
                .expect(400)
        })

        it('creates a published post and auto-generates a slug', async () => {
            const title = unique('published-post')

            const res = await api(app)
                .post('/api/blogs')
                .set(...authHeader(accessToken))
                .send({
                    title,
                    content: 'A deep dive into clean architecture patterns with NestJS.',
                    excerpt: 'A short excerpt about clean architecture.',
                    tags: ['NestJS', 'Architecture'],
                    isPublished: true,
                })
                .expect(201)

            const body = res.body as BlogDetail
            expect(body.title).toBe(title)
            expect(body.isPublished).toBe(true)
            expect(body.slug.length).toBeGreaterThan(0)
            expect(body.tags).toEqual(['NestJS', 'Architecture'])

            publishedPost = body
        })

        it('creates a draft post', async () => {
            const title = unique('draft-post')

            const res = await api(app)
                .post('/api/blogs')
                .set(...authHeader(accessToken))
                .send({ title, content: 'A draft nobody should see publicly yet.' })
                .expect(201)

            const body = res.body as BlogDetail
            expect(body.isPublished).toBe(false)
            draftPost = body
        })
    })

    let publishedPost: BlogDetail
    let draftPost: BlogDetail

    describe('GET /api/blogs (public)', () => {
        it('includes the published post but not the draft', async () => {
            const res = await api(app).get('/api/blogs').expect(200)
            const body = res.body as BlogSummary[]

            expect(body.some((b) => b.id === publishedPost.id)).toBe(true)
            expect(body.some((b) => b.id === draftPost.id)).toBe(false)
        })
    })

    describe('GET /api/blogs/admin', () => {
        it('requires authentication', async () => {
            await api(app).get('/api/blogs/admin').expect(401)
        })

        it('includes both the published post and the draft', async () => {
            const res = await api(app)
                .get('/api/blogs/admin')
                .set(...authHeader(accessToken))
                .expect(200)

            const body = res.body as BlogSummary[]
            expect(body.some((b) => b.id === publishedPost.id)).toBe(true)
            expect(body.some((b) => b.id === draftPost.id)).toBe(true)
        })
    })

    describe('GET /api/blogs/search', () => {
        // This is the test that catches the search_vector regression: if the
        // populating trigger from migration 20260903120000_blog_search_vector
        // is ever reverted or dropped, search_vector goes back to NULL on
        // every row and this assertion fails.
        it('finds the published post by a distinctive word from its title', async () => {
            const searchTerm = publishedPost.title.split('-').slice(0, 2).join(' ')

            const res = await api(app)
                .get(`/api/blogs/search?q=${encodeURIComponent(searchTerm)}`)
                .expect(200)

            const body = res.body as BlogSummary[]
            expect(body.some((b) => b.id === publishedPost.id)).toBe(true)
        })

        it('returns an empty array for a query that matches nothing', async () => {
            const res = await api(app)
                .get(`/api/blogs/search?q=${encodeURIComponent('zzz-no-such-content-anywhere-zzz')}`)
                .expect(200)

            const body = res.body as BlogSummary[]
            expect(body).toEqual([])
        })
    })

    describe('GET /api/blogs/:slug', () => {
        it('returns the full post by slug', async () => {
            const res = await api(app).get(`/api/blogs/${publishedPost.slug}`).expect(200)
            const body = res.body as BlogDetail
            expect(body.id).toBe(publishedPost.id)
            expect(body.content.length).toBeGreaterThan(0)
        })

        it('returns 404 for an unknown slug', async () => {
            await api(app).get('/api/blogs/this-slug-does-not-exist-anywhere').expect(404)
        })
    })

    describe('PATCH /api/blogs/:id', () => {
        it('requires authentication', async () => {
            await api(app).patch(`/api/blogs/${draftPost.id}`).send({ title: 'New Title' }).expect(401)
        })

        it('updates the draft to published', async () => {
            const res = await api(app)
                .patch(`/api/blogs/${draftPost.id}`)
                .set(...authHeader(accessToken))
                .send({ isPublished: true })
                .expect(200)

            const body = res.body as BlogDetail
            expect(body.isPublished).toBe(true)

            const publicListRes = await api(app).get('/api/blogs').expect(200)
            const publicList = publicListRes.body as BlogSummary[]
            expect(publicList.some((b) => b.id === draftPost.id)).toBe(true)
        })

        it('returns 404 for a non-existent post', async () => {
            await api(app)
                .patch('/api/blogs/999999999')
                .set(...authHeader(accessToken))
                .send({ title: 'Does not matter' })
                .expect(404)
        })
    })

    describe('DELETE /api/blogs/:id', () => {
        it('requires authentication', async () => {
            await api(app).delete(`/api/blogs/${draftPost.id}`).expect(401)
        })

        it('deletes both posts created in this run', async () => {
            await api(app)
                .delete(`/api/blogs/${publishedPost.id}`)
                .set(...authHeader(accessToken))
                .expect(204)

            await api(app)
                .delete(`/api/blogs/${draftPost.id}`)
                .set(...authHeader(accessToken))
                .expect(204)

            await api(app).get(`/api/blogs/${publishedPost.slug}`).expect(404)
        })

        it('returns 404 when deleting an already-deleted post', async () => {
            await api(app)
                .delete(`/api/blogs/${publishedPost.id}`)
                .set(...authHeader(accessToken))
                .expect(404)
        })
    })
})
