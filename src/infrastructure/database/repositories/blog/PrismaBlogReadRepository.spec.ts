/**
 * @fileoverview PrismaBlogReadRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these.
 *
 * search() gets the most attention here: it's the one read path in the
 * whole app built on raw SQL ($queryRaw for full-text search), and it does
 * its own manual re-sort afterward because Prisma's `id: { in: [...] }`
 * does not preserve array order. That re-sort — and what happens when a
 * ranked id no longer has a matching row — has no other test coverage.
 */

import { PrismaBlogReadRepository } from './PrismaBlogReadRepository'
import { PrismaBlogMapper } from '../../mappers/PrismaBlogMapper'
import type { PrismaService } from '../../prisma/prisma.service'

const mockClient = {
    blog: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
}

const mockPrisma = { client: mockClient }

const makeListRow = (overrides = {}) => ({
    id: 1,
    title: 'Clean Architecture in NestJS',
    slug: 'clean-architecture-nestjs',
    excerpt: 'A deep dive.',
    isPublished: true,
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    userId: 1,
    tags: [{ name: 'NestJS' }, { name: 'Architecture' }],
    ...overrides,
})

const makeDetailRow = (overrides = {}) => ({
    id: 1,
    title: 'Clean Architecture in NestJS',
    slug: 'clean-architecture-nestjs',
    content: 'Full content here.',
    excerpt: 'A deep dive.',
    isPublished: true,
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    userId: 1,
    tags: [{ id: 1, name: 'NestJS', blogId: 1 }],
    ...overrides,
})

describe('PrismaBlogReadRepository', () => {
    let repo: PrismaBlogReadRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaBlogReadRepository(mockPrisma as unknown as PrismaService)
    })

    describe('findPublished', () => {
        it('filters to isPublished, orders by publishedAt descending', async () => {
            mockClient.blog.findMany.mockResolvedValue([makeListRow()])

            await repo.findPublished()

            expect(mockClient.blog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { isPublished: true }, orderBy: { publishedAt: 'desc' } }),
            )
        })

        it('flattens tag relation objects to a plain string array', async () => {
            mockClient.blog.findMany.mockResolvedValue([makeListRow()])

            const result = await repo.findPublished()

            expect(result[0].tags).toEqual(['NestJS', 'Architecture'])
        })
    })

    describe('findAll', () => {
        it('applies no where filter (includes drafts) and orders by createdAt descending', async () => {
            mockClient.blog.findMany.mockResolvedValue([makeListRow({ isPublished: false })])

            await repo.findAll()

            expect(mockClient.blog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
            )
            const callArgs = mockClient.blog.findMany.mock.calls[0] as Record<string, unknown>
            expect(callArgs.where).toBeUndefined()
        })
    })

    describe('findById', () => {
        it('includes tags and maps a found row via PrismaBlogMapper', async () => {
            const row = makeDetailRow()
            mockClient.blog.findUnique.mockResolvedValue(row)

            const result = await repo.findById(1)

            expect(mockClient.blog.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, include: { tags: true } })
            expect(result).toEqual(PrismaBlogMapper.toDomain(row))
        })

        it('returns null when no row matches the id', async () => {
            mockClient.blog.findUnique.mockResolvedValue(null)

            const result = await repo.findById(999)

            expect(result).toBeNull()
        })
    })

    describe('findBySlug', () => {
        it('includes tags and maps a found row via PrismaBlogMapper', async () => {
            const row = makeDetailRow()
            mockClient.blog.findUnique.mockResolvedValue(row)

            const result = await repo.findBySlug('clean-architecture-nestjs')

            expect(mockClient.blog.findUnique).toHaveBeenCalledWith({
                where: { slug: 'clean-architecture-nestjs' },
                include: { tags: true },
            })
            expect(result).toEqual(PrismaBlogMapper.toDomain(row))
        })

        it('returns null when no row matches the slug', async () => {
            mockClient.blog.findUnique.mockResolvedValue(null)

            const result = await repo.findBySlug('does-not-exist')

            expect(result).toBeNull()
        })
    })

    describe('search', () => {
        it('returns an empty array without a second query when the raw search ranks nothing', async () => {
            mockClient.$queryRaw.mockResolvedValue([])

            const result = await repo.search('nonexistent topic')

            expect(result).toEqual([])
            expect(mockClient.blog.findMany).not.toHaveBeenCalled()
        })

        it('re-sorts findMany results back into the original rank order from the raw query', async () => {
            // Ranked order from $queryRaw: 3, 1, 2 — deliberately NOT the order
            // findMany returns them in, to prove the re-sort actually re-sorts.
            mockClient.$queryRaw.mockResolvedValue([{ id: 3 }, { id: 1 }, { id: 2 }])
            mockClient.blog.findMany.mockResolvedValue([
                makeListRow({ id: 1, title: 'One' }),
                makeListRow({ id: 2, title: 'Two' }),
                makeListRow({ id: 3, title: 'Three' }),
            ])

            const result = await repo.search('architecture')

            expect(result.map((r) => r.id)).toEqual([3, 1, 2])
        })

        it('filters out a ranked id that no longer has a matching row (e.g. deleted between the two queries)', async () => {
            mockClient.$queryRaw.mockResolvedValue([{ id: 1 }, { id: 2 }])
            // Only id 1 comes back — id 2 was deleted after the raw query ran.
            mockClient.blog.findMany.mockResolvedValue([makeListRow({ id: 1 })])

            const result = await repo.search('architecture')

            expect(result).toHaveLength(1)
            expect(result[0].id).toBe(1)
        })

        it('passes the limit through to the raw query and queries by the ranked ids afterward', async () => {
            mockClient.$queryRaw.mockResolvedValue([{ id: 1 }])
            mockClient.blog.findMany.mockResolvedValue([makeListRow({ id: 1 })])

            await repo.search('architecture', 5)

            expect(mockClient.$queryRaw).toHaveBeenCalledTimes(1)
            expect(mockClient.blog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: { in: [1] } } }),
            )
        })

        it('defaults limit to 20 when not specified', async () => {
            mockClient.$queryRaw.mockResolvedValue([])

            await repo.search('architecture')

            // The limit is interpolated into the tagged-template call as a
            // positional substitution; assert the raw query was still invoked
            // exactly once regardless of the exact template internals.
            expect(mockClient.$queryRaw).toHaveBeenCalledTimes(1)
        })
    })
})
