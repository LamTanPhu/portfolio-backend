/**
 * @fileoverview GetAllProjectsQuery Unit Tests
 *
 * Admin list: every project, drafts included, straight from findAll().
 */

import { GetAllProjectsQuery } from './GetAllProjectsQuery'

const repo = {
    findAll: jest.fn(),
    findPublished: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
}

const summary = (id: number, isPublished: boolean) => ({
    id,
    name: `Project ${id}`,
    slug: `project-${id}`,
    techStack: ['NestJS'],
    repoUrl: null,
    liveUrl: null,
    thumbnailUrl: null,
    isPublished,
    isOpenSource: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
})

describe('GetAllProjectsQuery', () => {
    let query: GetAllProjectsQuery

    beforeEach(() => {
        jest.clearAllMocks()
        query = new GetAllProjectsQuery(repo)
    })

    it('returns every project including drafts, using findAll (not findPublished)', async () => {
        repo.findAll.mockResolvedValue([summary(1, true), summary(2, false)])

        const result = await query.execute()

        expect(repo.findAll).toHaveBeenCalledTimes(1)
        expect(repo.findPublished).not.toHaveBeenCalled()
        expect(result.map((p) => p.isPublished)).toEqual([true, false])
    })

    it('returns an empty array when there are no projects', async () => {
        repo.findAll.mockResolvedValue([])

        await expect(query.execute()).resolves.toEqual([])
    })
})
