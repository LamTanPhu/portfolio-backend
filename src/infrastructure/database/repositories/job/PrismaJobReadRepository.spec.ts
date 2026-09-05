/**
 * @fileoverview PrismaJobReadRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these. Unlike its siblings, this repository exposes
 * both a DTO-shaped findAll() (for the public /about/jobs list) and a
 * domain-entity findById() — both are covered here.
 */

import { PrismaJobReadRepository } from './PrismaJobReadRepository'
import { PrismaJobMapper } from '../../mappers/PrismaJobMapper'
import type { PrismaService } from '../../prisma/prisma.service'

const mockClient = {
    job: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
    },
}

const mockPrisma = { client: mockClient }

const makeListRow = (overrides = {}) => ({
    id: 1,
    companyName: 'Acme Corp',
    role: 'Senior Backend Engineer',
    startedAt: new Date('2022-01-01T00:00:00.000Z'),
    endedAt: null,
    isEnded: false,
    ...overrides,
})

const makeFullRow = (overrides = {}) => ({
    id: 1,
    companyName: 'Acme Corp',
    role: 'Senior Backend Engineer',
    startedAt: new Date('2022-01-01T00:00:00.000Z'),
    endedAt: null,
    isEnded: false,
    userId: 1,
    createdAt: new Date('2022-01-01T00:00:00.000Z'),
    updatedAt: new Date('2022-01-01T00:00:00.000Z'),
    ...overrides,
})

describe('PrismaJobReadRepository', () => {
    let repo: PrismaJobReadRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaJobReadRepository(mockPrisma as unknown as PrismaService)
    })

    describe('findAll', () => {
        it('orders by startedAt descending', async () => {
            mockClient.job.findMany.mockResolvedValue([makeListRow()])

            await repo.findAll()

            expect(mockClient.job.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ orderBy: { startedAt: 'desc' } }),
            )
        })

        it('maps dates to ISO strings', async () => {
            mockClient.job.findMany.mockResolvedValue([makeListRow({ endedAt: new Date('2023-12-31T00:00:00.000Z') })])

            const result = await repo.findAll()

            expect(result[0].startedAt).toBe('2022-01-01T00:00:00.000Z')
            expect(result[0].endedAt).toBe('2023-12-31T00:00:00.000Z')
        })

        it('maps a null endedAt to null (still employed) rather than throwing on .toISOString()', async () => {
            mockClient.job.findMany.mockResolvedValue([makeListRow({ endedAt: null })])

            const result = await repo.findAll()

            expect(result[0].endedAt).toBeNull()
        })
    })

    describe('findById', () => {
        it('maps a found row via PrismaJobMapper', async () => {
            const row = makeFullRow()
            mockClient.job.findUnique.mockResolvedValue(row)

            const result = await repo.findById(1)

            expect(mockClient.job.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })
            expect(result).toEqual(PrismaJobMapper.toDomain(row))
        })

        it('returns null when no row matches the id', async () => {
            mockClient.job.findUnique.mockResolvedValue(null)

            const result = await repo.findById(999)

            expect(result).toBeNull()
        })
    })
})
