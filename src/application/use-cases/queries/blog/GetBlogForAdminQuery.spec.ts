/**
 * @fileoverview GetBlogForAdminQuery Unit Tests
 *
 * The admin counterpart of GetBlogBySlugQuery: it must return a post whether
 * or not it is published, and must never touch the public cache.
 */

import { GetBlogForAdminQuery } from './GetBlogForAdminQuery'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'

const repo = {
    findPublished: jest.fn(),
    findAll: jest.fn(),
    search: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
}

const makeBlog = (overrides = {}) => ({
    id: 7,
    title: 'Work in progress',
    slug: 'work-in-progress',
    content: 'Unfinished draft body.',
    excerpt: null,
    tags: [{ id: 1, name: 'Draft', blogId: 7 }],
    isPublished: false,
    publishedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    userId: 1,
    ...overrides,
})

describe('GetBlogForAdminQuery', () => {
    let query: GetBlogForAdminQuery

    beforeEach(() => {
        jest.clearAllMocks()
        repo.findBySlug.mockResolvedValue(makeBlog())
        query = new GetBlogForAdminQuery(repo)
    })

    it('returns an UNPUBLISHED draft — the whole point of this query', async () => {
        const result = await query.execute('work-in-progress')

        expect(repo.findBySlug).toHaveBeenCalledWith('work-in-progress')
        expect(result).toEqual(
            expect.objectContaining({
                id: 7,
                slug: 'work-in-progress',
                content: 'Unfinished draft body.',
                tags: ['Draft'],
                isPublished: false,
                publishedAt: null,
            }),
        )
    })

    it('also returns a published post', async () => {
        repo.findBySlug.mockResolvedValue(
            makeBlog({ isPublished: true, publishedAt: new Date('2026-02-01T00:00:00.000Z') }),
        )

        const result = await query.execute('work-in-progress')

        expect(result.isPublished).toBe(true)
        expect(result.publishedAt).toBe('2026-02-01T00:00:00.000Z')
    })

    it('throws NotFoundError when no blog matches the slug', async () => {
        repo.findBySlug.mockResolvedValue(null)

        await expect(query.execute('nope')).rejects.toThrow(NotFoundError)
    })

    it('propagates repository failures', async () => {
        repo.findBySlug.mockRejectedValue(new Error('db down'))

        await expect(query.execute('work-in-progress')).rejects.toThrow('db down')
    })
})
