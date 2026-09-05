/**
 * @fileoverview PrismaJobWriteRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these. `Prisma.PrismaClientKnownRequestError` is
 * constructed for real so the repository's own `instanceof` checks
 * exercise the same branch they would against a genuine Prisma error.
 */

import { Prisma } from '@prisma/client'
import { PrismaJobWriteRepository } from './PrismaJobWriteRepository'
import { PrismaJobMapper } from '../../mappers/PrismaJobMapper'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { PrismaService } from '../../prisma/prisma.service'

const mockClient = {
    job: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
}

const mockPrisma = { client: mockClient }

const makeKnownError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('boom', { code, clientVersion: '5.0.0' })

const makeRow = (overrides = {}) => ({
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

describe('PrismaJobWriteRepository', () => {
    let repo: PrismaJobWriteRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaJobWriteRepository(mockPrisma as unknown as PrismaService)
    })

    describe('create', () => {
        it('passes the input straight through as Prisma create data', async () => {
            const input = {
                companyName: 'Acme Corp',
                role: 'Senior Backend Engineer',
                startedAt: new Date('2022-01-01'),
                endedAt: null,
                isEnded: false,
                userId: 1,
            }
            mockClient.job.create.mockResolvedValue(makeRow())

            await repo.create(input)

            expect(mockClient.job.create).toHaveBeenCalledWith({ data: input })
        })

        it('maps the created row via PrismaJobMapper', async () => {
            const row = makeRow()
            mockClient.job.create.mockResolvedValue(row)

            const result = await repo.create({
                companyName: row.companyName,
                role: row.role,
                startedAt: row.startedAt,
                endedAt: row.endedAt,
                isEnded: row.isEnded,
                userId: row.userId,
            })

            expect(result).toEqual(PrismaJobMapper.toDomain(row))
        })
    })

    describe('update', () => {
        it('updates by id with the given data', async () => {
            mockClient.job.update.mockResolvedValue(makeRow({ role: 'Staff Engineer' }))

            await repo.update(1, { role: 'Staff Engineer' })

            expect(mockClient.job.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { role: 'Staff Engineer' } })
        })

        it('maps the updated row via PrismaJobMapper', async () => {
            const row = makeRow({ role: 'Staff Engineer' })
            mockClient.job.update.mockResolvedValue(row)

            const result = await repo.update(1, { role: 'Staff Engineer' })

            expect(result).toEqual(PrismaJobMapper.toDomain(row))
        })

        it('translates a P2025 record-not-found error into NotFoundError naming the id', async () => {
            mockClient.job.update.mockRejectedValue(makeKnownError('P2025'))

            await expect(repo.update(999, { role: 'x' })).rejects.toThrow(new NotFoundError('Job not found: 999'))
        })

        it('re-throws any other Prisma error code unchanged', async () => {
            const error = makeKnownError('P2002')
            mockClient.job.update.mockRejectedValue(error)

            await expect(repo.update(1, { role: 'x' })).rejects.toBe(error)
        })
    })

    describe('delete', () => {
        it('deletes by id', async () => {
            mockClient.job.delete.mockResolvedValue(makeRow())

            await repo.delete(1)

            expect(mockClient.job.delete).toHaveBeenCalledWith({ where: { id: 1 } })
        })

        it('translates a P2025 record-not-found error into NotFoundError naming the id', async () => {
            mockClient.job.delete.mockRejectedValue(makeKnownError('P2025'))

            await expect(repo.delete(999)).rejects.toThrow(new NotFoundError('Job not found: 999'))
        })

        it('re-throws a non-Prisma error unchanged', async () => {
            const error = new Error('connection reset')
            mockClient.job.delete.mockRejectedValue(error)

            await expect(repo.delete(1)).rejects.toBe(error)
        })
    })
})
