/**
 * @fileoverview GetPublishedProjectsQuery Unit Tests
 */

import { GetPublishedProjectsQuery } from './GetPublishedProjectsQuery'

const repo = {
    findAll: jest.fn(),
    findPublished: jest.fn(),
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

const makeProjectSummary = (overrides = {}) => ({
    id: 1,
    name: 'My Portfolio Backend',
    slug: 'my-portfolio-backend',
    techStack: ['NestJS'],
    repoUrl: null,
    liveUrl: null,
    thumbnailUrl: null,
    isPublished: true,
    isOpenSource: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
})

describe('GetPublishedProjectsQuery', () => {
    let query: GetPublishedProjectsQuery

    beforeEach(() => {
        jest.clearAllMocks()
        cacheQuery.getOrSetWithProfile.mockImplementation(
            (_key: string, _profile: string, factory: () => Promise<any>) => factory(),
        )
        repo.findPublished.mockResolvedValue([makeProjectSummary()])

        query = new GetPublishedProjectsQuery(repo, cacheQuery)
    })

    it('returns published project summaries without a description field', async () => {
        const result = await query.execute()

        expect(result).toEqual([expect.objectContaining({ id: 1, slug: 'my-portfolio-backend' })])
        expect(result[0]).not.toHaveProperty('description')
    })

    it('uses the MEDIUM cache profile under the project:list:public key', async () => {
        await query.execute()

        expect(cacheQuery.getOrSetWithProfile).toHaveBeenCalledWith(
            'project:list:public',
            'MEDIUM',
            expect.any(Function),
        )
    })

    it('calls repo.findPublished, not findAll — unpublished projects must never appear here', async () => {
        await query.execute()

        expect(repo.findPublished).toHaveBeenCalledTimes(1)
        expect(repo.findAll).not.toHaveBeenCalled()
    })

    it('returns an empty array when there are no published projects', async () => {
        repo.findPublished.mockResolvedValue([])

        const result = await query.execute()

        expect(result).toEqual([])
    })
})
