/**
 * @fileoverview PrismaProjectReadRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these. The list select intentionally excludes
 * `description` (bandwidth saving) — verified below alongside the
 * published-vs-all distinction and both single-item lookups.
 */

import { ProjectMapper } from '../../mappers/ProjectMapper'
import type { PrismaService } from '../../prisma/prisma.service'
import { PrismaProjectReadRepository } from './PrismaProjectReadRepository'

const mockClient = {
    project: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
    },
}

const mockPrisma = { client: mockClient }

const makeListRow = (overrides = {}) => ({
    id: 1,
    name: 'My Portfolio Backend',
    slug: 'my-portfolio-backend',
    techStack: ['NestJS'],
    repoUrl: null,
    liveUrl: null,
    thumbnailUrl: null,
    isPublished: true,
    isOpenSource: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
})

const makeFullRow = (overrides = {}) => ({
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

describe('PrismaProjectReadRepository', () => {
    let repo: PrismaProjectReadRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaProjectReadRepository(mockPrisma as unknown as PrismaService)
    })

    describe('findPublished', () => {
        it('filters to isPublished and excludes description from the select', async () => {
            mockClient.project.findMany.mockResolvedValue([makeListRow()])

            await repo.findPublished()

            const callArgs = (mockClient.project.findMany.mock.calls[0] as unknown[])[0] as {
                where: unknown
                select: Record<string, unknown>
            }
            expect(callArgs.where).toEqual({ isPublished: true })
            expect(callArgs.select).not.toHaveProperty('description')
        })

        it('maps dates to ISO strings in the summary DTO', async () => {
            mockClient.project.findMany.mockResolvedValue([makeListRow()])

            const result = await repo.findPublished()

            expect(result[0].createdAt).toBe('2026-01-01T00:00:00.000Z')
            expect(result[0]).not.toHaveProperty('description')
        })
    })

    describe('findAll', () => {
        it('applies no where filter (includes unpublished projects)', async () => {
            mockClient.project.findMany.mockResolvedValue([makeListRow({ isPublished: false })])

            await repo.findAll()

            const callArgs = (mockClient.project.findMany.mock.calls[0] as unknown[])[0] as Record<string, unknown>
            expect(callArgs.where).toBeUndefined()
        })
    })

    describe('findById', () => {
        it('maps a found row via ProjectMapper', async () => {
            const row = makeFullRow()
            mockClient.project.findUnique.mockResolvedValue(row)

            const result = await repo.findById(1)

            expect(mockClient.project.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })
            expect(result).toEqual(ProjectMapper.toDomain(row))
        })

        it('returns null when no row matches the id', async () => {
            mockClient.project.findUnique.mockResolvedValue(null)

            const result = await repo.findById(999)

            expect(result).toBeNull()
        })
    })

    describe('findBySlug', () => {
        it('maps a found row via ProjectMapper', async () => {
            const row = makeFullRow()
            mockClient.project.findUnique.mockResolvedValue(row)

            const result = await repo.findBySlug('my-portfolio-backend')

            expect(mockClient.project.findUnique).toHaveBeenCalledWith({ where: { slug: 'my-portfolio-backend' } })
            expect(result).toEqual(ProjectMapper.toDomain(row))
        })

        it('returns null when no row matches the slug', async () => {
            mockClient.project.findUnique.mockResolvedValue(null)

            const result = await repo.findBySlug('does-not-exist')

            expect(result).toBeNull()
        })
    })
})
