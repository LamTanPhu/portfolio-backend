/**
 * @fileoverview PrismaProjectViewRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these.
 */

import { PrismaProjectViewRepository } from './PrismaProjectViewRepository'
import { ProjectView } from '../../../domain/entities/ProjectView'
import type { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
    client: {
        projectView: {
            upsert: jest.fn(),
            aggregate: jest.fn(),
            findMany: jest.fn(),
        },
    },
}

const makeRow = (overrides = {}) => ({
    id: 1,
    projectId: 5,
    date: new Date('2026-02-01T00:00:00.000Z'),
    count: 10,
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    ...overrides,
})

describe('PrismaProjectViewRepository', () => {
    let repo: PrismaProjectViewRepository

    beforeEach(() => {
        jest.clearAllMocks()
        jest.useFakeTimers().setSystemTime(new Date('2026-02-01T15:30:00.000Z'))
        repo = new PrismaProjectViewRepository(mockPrisma as unknown as PrismaService)
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    describe('increment', () => {
        it('normalizes the date to midnight UTC before upserting on [projectId, date]', async () => {
            mockPrisma.client.projectView.upsert.mockResolvedValue(makeRow())

            await repo.increment(5)

            expect(mockPrisma.client.projectView.upsert).toHaveBeenCalledWith({
                where: { projectId_date: { projectId: 5, date: new Date('2026-02-01T00:00:00.000Z') } },
                update: { count: { increment: 1 } },
                create: { projectId: 5, date: new Date('2026-02-01T00:00:00.000Z'), count: 1 },
            })
        })
    })

    describe('getTotalViews', () => {
        it('sums count via a single aggregate query, not by fetching all rows', async () => {
            mockPrisma.client.projectView.aggregate.mockResolvedValue({ _sum: { count: 250 } })

            const result = await repo.getTotalViews(5)

            expect(mockPrisma.client.projectView.aggregate).toHaveBeenCalledWith({
                where: { projectId: 5 },
                _sum: { count: true },
            })
            expect(mockPrisma.client.projectView.findMany).not.toHaveBeenCalled()
            expect(result).toBe(250)
        })

        it('returns 0 rather than null when the project has no view rows yet', async () => {
            mockPrisma.client.projectView.aggregate.mockResolvedValue({ _sum: { count: null } })

            const result = await repo.getTotalViews(999)

            expect(result).toBe(0)
        })
    })

    describe('findByProject', () => {
        it('orders by date descending and maps every row to a ProjectView entity', async () => {
            mockPrisma.client.projectView.findMany.mockResolvedValue([makeRow()])

            const result = await repo.findByProject(5)

            expect(mockPrisma.client.projectView.findMany).toHaveBeenCalledWith({
                where: { projectId: 5 },
                orderBy: { date: 'desc' },
            })
            expect(result).toEqual([
                new ProjectView(
                    1,
                    5,
                    new Date('2026-02-01T00:00:00.000Z'),
                    10,
                    new Date('2026-02-01T00:00:00.000Z'),
                    new Date('2026-02-01T00:00:00.000Z'),
                ),
            ])
        })
    })
})
