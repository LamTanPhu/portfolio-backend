/**
 * @fileoverview PrismaPageViewRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these. Each test verifies the exact Prisma call
 * shape (upsert/findUnique/findMany args) and the row -> domain mapping.
 */

import { PrismaPageViewRepository } from './PrismaPageViewRepository'
import { PageView } from '../../../domain/entities/PageView'
import type { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
    client: {
        pageView: {
            upsert: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
    },
}

const makeRow = (overrides = {}) => ({
    id: 1,
    route: '/blog/my-post',
    count: 42,
    lastViewedAt: new Date('2026-02-01T00:00:00.000Z'),
    ...overrides,
})

describe('PrismaPageViewRepository', () => {
    let repo: PrismaPageViewRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaPageViewRepository(mockPrisma as unknown as PrismaService)
    })

    describe('increment', () => {
        it('upserts on the route unique key, incrementing count or creating with count 1', async () => {
            mockPrisma.client.pageView.upsert.mockResolvedValue(makeRow())

            await repo.increment('/blog/my-post')

            expect(mockPrisma.client.pageView.upsert).toHaveBeenCalledWith({
                where: { route: '/blog/my-post' },
                update: { count: { increment: 1 } },
                create: { route: '/blog/my-post', count: 1 },
            })
        })
    })

    describe('findByRoute', () => {
        it('maps the found row to a PageView entity', async () => {
            mockPrisma.client.pageView.findUnique.mockResolvedValue(makeRow())

            const result = await repo.findByRoute('/blog/my-post')

            expect(mockPrisma.client.pageView.findUnique).toHaveBeenCalledWith({ where: { route: '/blog/my-post' } })
            expect(result).toEqual(new PageView(1, '/blog/my-post', 42, new Date('2026-02-01T00:00:00.000Z')))
        })

        it('returns null when no row matches the route', async () => {
            mockPrisma.client.pageView.findUnique.mockResolvedValue(null)

            const result = await repo.findByRoute('/does-not-exist')

            expect(result).toBeNull()
        })
    })

    describe('findAll', () => {
        it('orders by count descending and maps every row to a PageView entity', async () => {
            mockPrisma.client.pageView.findMany.mockResolvedValue([
                makeRow({ id: 1, route: '/', count: 100 }),
                makeRow({ id: 2, route: '/about', count: 10 }),
            ])

            const result = await repo.findAll()

            expect(mockPrisma.client.pageView.findMany).toHaveBeenCalledWith({ orderBy: { count: 'desc' } })
            expect(result).toHaveLength(2)
            expect(result[0]).toBeInstanceOf(PageView)
            expect(result[0].route).toBe('/')
        })

        it('returns an empty array when there are no page views yet', async () => {
            mockPrisma.client.pageView.findMany.mockResolvedValue([])

            const result = await repo.findAll()

            expect(result).toEqual([])
        })
    })
})
