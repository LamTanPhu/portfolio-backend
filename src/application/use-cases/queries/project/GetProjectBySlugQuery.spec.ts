/**
 * @fileoverview GetProjectBySlugQuery Unit Tests
 *
 * cacheQuery.getOrSetWithProfile executes its factory immediately, same as a
 * real cache miss — keeps these tests about this query's own logic rather
 * than the cache implementation, which has its own test suite.
 */

import { GetProjectBySlugQuery } from './GetProjectBySlugQuery'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'

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

const makeProject = (overrides = {}) => ({
    id: 1,
    name: 'My Portfolio Backend',
    description: 'A clean-architecture NestJS backend.',
    slug: 'my-portfolio-backend',
    techStack: ['NestJS'],
    repoUrl: null,
    liveUrl: null,
    thumbnailUrl: null,
    isPublished: true,
    isOpenSource: true,
    userId: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
})

describe('GetProjectBySlugQuery', () => {
    let query: GetProjectBySlugQuery

    beforeEach(() => {
        jest.clearAllMocks()
        cacheQuery.getOrSetWithProfile.mockImplementation(
            (_key: string, _profile: string, factory: () => Promise<any>) => factory(),
        )
        repo.findBySlug.mockResolvedValue(makeProject())

        query = new GetProjectBySlugQuery(repo, cacheQuery)
    })

    it('returns the full project detail including description', async () => {
        const result = await query.execute('my-portfolio-backend')

        expect(result).toEqual({
            id: 1,
            name: 'My Portfolio Backend',
            description: 'A clean-architecture NestJS backend.',
            slug: 'my-portfolio-backend',
            techStack: ['NestJS'],
            repoUrl: null,
            liveUrl: null,
            thumbnailUrl: null,
            isPublished: true,
            isOpenSource: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        })
    })

    it('uses the LONG cache profile under a project:<slug> key', async () => {
        await query.execute('my-portfolio-backend')

        expect(cacheQuery.getOrSetWithProfile).toHaveBeenCalledWith(
            'project:my-portfolio-backend',
            'LONG',
            expect.any(Function),
        )
    })

    it('throws NotFoundError when no project matches the slug', async () => {
        repo.findBySlug.mockResolvedValue(null)

        await expect(query.execute('does-not-exist')).rejects.toThrow(NotFoundError)
    })
})
