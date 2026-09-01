import { SearchBlogsQuery } from './SearchBlogsQuery'
import type { BlogSummary } from '../../../../domain/projections/BlogSummary'

describe('SearchBlogsQuery', () => {
    let query: SearchBlogsQuery

    const summary: BlogSummary = {
        id: 1,
        title: 'Clean Architecture in NestJS',
        slug: 'clean-architecture-nestjs',
        excerpt: 'A deep dive.',
        tags: ['NestJS'],
        isPublished: true,
        publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }

    // Plain object literals with inferred types — not jest.Mocked<Interface> —
    // matching CacheQueryService.spec.ts's own convention. Typing these
    // against the interface directly preserves its method-shorthand
    // signatures, which trips @typescript-eslint/unbound-method the moment
    // a method reference is passed to toHaveBeenCalledWith below.
    const repo = {
        findPublished: jest.fn(),
        findAll: jest.fn(),
        search: jest.fn(),
        findById: jest.fn(),
        findBySlug: jest.fn(),
    }

    const cacheQuery = {
        getOrSet: jest.fn(),
        // Executes the factory immediately, same as a real cache miss —
        // keeps these tests about SearchBlogsQuery's own logic rather than
        // the cache implementation, which has its own test suite.
        // NOTE: factory typed as `Promise<any>`, not `Promise<unknown>` —
        // ICacheQueryService.getOrSetWithProfile is generic over <T>, and a
        // mock pinned to `unknown` can't stand in for "works for any T".
        // `any` is bivariant-compatible and keeps the assignment happy.
        getOrSetWithProfile: jest.fn((_key: string, _profile: string, factory: () => Promise<any>) => factory()),
        delete: jest.fn(),
        deletePattern: jest.fn(),
        clear: jest.fn(),
    }

    beforeEach(() => {
        jest.clearAllMocks()
        repo.search.mockResolvedValue([summary])
        cacheQuery.getOrSetWithProfile.mockImplementation(
            (_key: string, _profile: string, factory: () => Promise<any>) => factory(),
        )

        query = new SearchBlogsQuery(repo, cacheQuery)
    })

    it('maps repository results to BlogSummaryDTO', async () => {
        const result = await query.execute('clean architecture')

        expect(result).toEqual([
            {
                id: 1,
                title: 'Clean Architecture in NestJS',
                slug: 'clean-architecture-nestjs',
                excerpt: 'A deep dive.',
                tags: ['NestJS'],
                isPublished: true,
                publishedAt: '2026-01-01T00:00:00.000Z',
                createdAt: '2026-01-01T00:00:00.000Z',
            },
        ])
    })

    it('normalizes the query (trim + lowercase) before it reaches the repository or the cache key', async () => {
        await query.execute('  Clean Architecture  ')

        expect(repo.search).toHaveBeenCalledWith('clean architecture')
        expect(cacheQuery.getOrSetWithProfile).toHaveBeenCalledWith(
            'blog:search:clean architecture',
            'SHORT',
            expect.any(Function),
        )
    })

    it('uses the SHORT cache profile, not the longer profiles list/detail queries use', async () => {
        await query.execute('nestjs')

        expect(cacheQuery.getOrSetWithProfile).toHaveBeenCalledWith('blog:search:nestjs', 'SHORT', expect.any(Function))
    })

    it('returns an empty array when nothing matches, without throwing', async () => {
        repo.search.mockResolvedValueOnce([])

        const result = await query.execute('no such term anywhere')

        expect(result).toEqual([])
    })
})
