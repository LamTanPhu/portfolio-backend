/**
 * @fileoverview GetAllBlogsQuery Unit Tests
 *
 * Admin-only, uncached query. Verifies it maps repo summaries to DTOs
 * via BlogMapper and includes drafts (no isPublished filter applied here —
 * that's the whole point of this query vs GetPublishedBlogsQuery).
 */

import { GetAllBlogsQuery } from './GetAllBlogsQuery'
import type { BlogSummary } from '../../../../domain/projections/BlogSummary'

const repo = {
    findAll: jest.fn(),
    findPublished: jest.fn(),
    search: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
}

const makeSummary = (overrides: Partial<BlogSummary> = {}): BlogSummary => ({
    id: 1,
    title: 'Draft Post',
    slug: 'draft-post',
    excerpt: null,
    tags: [],
    isPublished: false,
    publishedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
})

describe('GetAllBlogsQuery', () => {
    let query: GetAllBlogsQuery

    beforeEach(() => {
        jest.clearAllMocks()
        query = new GetAllBlogsQuery(repo)
    })

    it('returns both drafts and published posts, unlike GetPublishedBlogsQuery', async () => {
        repo.findAll.mockResolvedValue([makeSummary({ isPublished: false }), makeSummary({ id: 2, isPublished: true })])

        const result = await query.execute()

        expect(result).toHaveLength(2)
        expect(repo.findAll).toHaveBeenCalledTimes(1)
    })

    it('maps repository summaries to BlogSummaryDTOs with ISO date strings', async () => {
        repo.findAll.mockResolvedValue([makeSummary()])

        const result = await query.execute()

        expect(result).toEqual([
            {
                id: 1,
                title: 'Draft Post',
                slug: 'draft-post',
                excerpt: null,
                tags: [],
                isPublished: false,
                publishedAt: null,
                createdAt: '2026-01-01T00:00:00.000Z',
            },
        ])
    })

    it('does not call findPublished or search — this is the admin-all-posts query', async () => {
        repo.findAll.mockResolvedValue([])

        await query.execute()

        expect(repo.findPublished).not.toHaveBeenCalled()
        expect(repo.search).not.toHaveBeenCalled()
    })

    it('returns an empty array when there are no posts at all', async () => {
        repo.findAll.mockResolvedValue([])

        const result = await query.execute()

        expect(result).toEqual([])
    })
})
