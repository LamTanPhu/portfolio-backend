/**
 * @fileoverview GetBlogBySlugQuery Unit Tests
 *
 * cacheQuery.getOrSetWithProfile executes its factory immediately, same as a
 * real cache miss — keeps these tests about this query's own logic rather
 * than the cache implementation, which has its own test suite.
 */

import { GetBlogBySlugQuery } from './GetBlogBySlugQuery'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'

const repo = {
    findPublished: jest.fn(),
    findAll: jest.fn(),
    search: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
}

const cacheQuery = {
    getOrSet: jest.fn(),
    getOrSetWithProfile: jest.fn((_key: string, _profile: string, factory: () => Promise<any>) => factory()),
    delete: jest.fn(),
    deletePattern: jest.fn(),
    clear: jest.fn(),
}

const makeBlog = (overrides = {}) => ({
    id: 1,
    title: 'Clean Architecture in NestJS',
    slug: 'clean-architecture-nestjs',
    content: 'Full content here.',
    excerpt: 'A deep dive.',
    tags: [{ id: 1, name: 'NestJS', blogId: 1 }],
    isPublished: true,
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    userId: 1,
    ...overrides,
})

describe('GetBlogBySlugQuery', () => {
    let query: GetBlogBySlugQuery

    beforeEach(() => {
        jest.clearAllMocks()
        cacheQuery.getOrSetWithProfile.mockImplementation(
            (_key: string, _profile: string, factory: () => Promise<any>) => factory(),
        )
        repo.findBySlug.mockResolvedValue(makeBlog())

        query = new GetBlogBySlugQuery(repo, cacheQuery)
    })

    it('returns the full blog detail including content', async () => {
        const result = await query.execute('clean-architecture-nestjs')

        expect(result).toEqual(
            expect.objectContaining({
                id: 1,
                title: 'Clean Architecture in NestJS',
                slug: 'clean-architecture-nestjs',
                content: 'Full content here.',
                tags: ['NestJS'],
            }),
        )
    })

    it('uses the LONG cache profile under a blog:<slug> key', async () => {
        await query.execute('clean-architecture-nestjs')

        expect(cacheQuery.getOrSetWithProfile).toHaveBeenCalledWith(
            'blog:clean-architecture-nestjs',
            'LONG',
            expect.any(Function),
        )
    })

    it('throws NotFoundError when no blog matches the slug', async () => {
        repo.findBySlug.mockResolvedValue(null)

        await expect(query.execute('does-not-exist')).rejects.toThrow(NotFoundError)
    })

    // SECURITY regression: a draft must be indistinguishable from a missing post.
    it('throws NotFoundError for an UNPUBLISHED blog, with the same message shape as a missing one', async () => {
        repo.findBySlug.mockResolvedValue(makeBlog({ isPublished: false }))

        await expect(query.execute('clean-architecture-nestjs')).rejects.toThrow(NotFoundError)
        await expect(query.execute('clean-architecture-nestjs')).rejects.toThrow(
            'Blog not found: clean-architecture-nestjs',
        )
    })

    it('performs the published check inside the cache loader, so a draft is never cached', async () => {
        repo.findBySlug.mockResolvedValue(makeBlog({ isPublished: false }))
        let loaderThrew = false
        cacheQuery.getOrSetWithProfile.mockImplementation(
            async (_key: string, _profile: string, factory: () => Promise<unknown>) => {
                try {
                    return await factory()
                } catch (error) {
                    loaderThrew = true
                    throw error
                }
            },
        )

        await expect(query.execute('draft-post')).rejects.toThrow(NotFoundError)
        expect(loaderThrew).toBe(true)
    })
})
