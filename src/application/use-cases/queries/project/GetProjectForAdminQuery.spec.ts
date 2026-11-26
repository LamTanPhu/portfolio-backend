/**
 * @fileoverview GetProjectForAdminQuery Unit Tests
 *
 * The admin counterpart of GetProjectBySlugQuery: returns a project whether
 * or not it is published.
 */

import { GetProjectForAdminQuery } from './GetProjectForAdminQuery'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'

const repo = {
    findAll: jest.fn(),
    findPublished: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
}

const makeProject = (overrides = {}) => ({
    id: 2,
    name: 'Work in progress',
    description: 'Unfinished project.',
    slug: 'work-in-progress',
    techStack: ['NestJS'],
    repoUrl: null,
    liveUrl: null,
    thumbnailUrl: null,
    isPublished: false,
    isOpenSource: true,
    userId: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
})

describe('GetProjectForAdminQuery', () => {
    let query: GetProjectForAdminQuery

    beforeEach(() => {
        jest.clearAllMocks()
        repo.findBySlug.mockResolvedValue(makeProject())
        query = new GetProjectForAdminQuery(repo)
    })

    it('returns an UNPUBLISHED project with its full description', async () => {
        const result = await query.execute('work-in-progress')

        expect(repo.findBySlug).toHaveBeenCalledWith('work-in-progress')
        expect(result).toEqual({
            id: 2,
            name: 'Work in progress',
            description: 'Unfinished project.',
            slug: 'work-in-progress',
            techStack: ['NestJS'],
            repoUrl: null,
            liveUrl: null,
            thumbnailUrl: null,
            isPublished: false,
            isOpenSource: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
        })
    })

    it('does not leak internal fields such as userId', async () => {
        const result = await query.execute('work-in-progress')

        expect(result).not.toHaveProperty('userId')
    })

    it('throws NotFoundError when no project matches the slug', async () => {
        repo.findBySlug.mockResolvedValue(null)

        await expect(query.execute('nope')).rejects.toThrow(NotFoundError)
    })
})
