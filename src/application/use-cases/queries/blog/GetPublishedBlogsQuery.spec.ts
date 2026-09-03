/**
 * @fileoverview GetPublishedBlogsQuery Unit Tests
 */

import { GetPublishedBlogsQuery } from './GetPublishedBlogsQuery'
import type { BlogSummary } from '../../../../domain/projections/BlogSummary'

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

const makeSummary = (overrides: Partial<BlogSummary> = {}): BlogSummary => ({
    id: 1,
    title: 'Published Post',
    slug: 'published-post',
    excerpt: 'excerpt',
    tags: ['NestJS'],
    isPublished: true,
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
})

describe('GetPublishedBlogsQuery', () => {
    let query: GetPublishedBlogsQuery

    beforeEach(() => {
        jest.clearAllMocks()
        cacheQuery.getOrSetWithProfile.mockImplementation(
            (_key: string, _profile: string, factory: () => Promise<any>) => factory(),
        )
        repo.findPublished.mockResolvedValue([makeSummary()])

        query = new GetPublishedBlogsQuery(repo, cacheQuery)
    })

    it('returns published summaries mapped to DTOs', async () => {
        const result = await query.execute()

        expect(result).toEqual([
            {
                id: 1,
                title: 'Published Post',
                slug: 'published-post',
                excerpt: 'excerpt',
                tags: ['NestJS'],
                isPublished: true,
                publishedAt: '2026-01-01T00:00:00.000Z',
                createdAt: '2026-01-01T00:00:00.000Z',
            },
        ])
    })

    it('uses the MEDIUM cache profile under the blog:list:public key', async () => {
        await query.execute()

        expect(cacheQuery.getOrSetWithProfile).toHaveBeenCalledWith('blog:list:public', 'MEDIUM', expect.any(Function))
    })

    it('calls repo.findPublished, not findAll — drafts must never appear here', async () => {
        await query.execute()

        expect(repo.findPublished).toHaveBeenCalledTimes(1)
        expect(repo.findAll).not.toHaveBeenCalled()
    })

    it('returns an empty array when there are no published posts', async () => {
        repo.findPublished.mockResolvedValue([])

        const result = await query.execute()

        expect(result).toEqual([])
    })
})
