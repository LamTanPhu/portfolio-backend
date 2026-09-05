/**
 * @fileoverview PrismaCertificationWriteRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these. `Prisma.PrismaClientKnownRequestError` is
 * constructed for real so the repository's own `instanceof` checks
 * exercise the same branch they would against a genuine Prisma error.
 *
 * Unlike the Blog write repository, this one has no transactional-client
 * (`tx`) support and no unique-constraint handling on create — only
 * update/delete translate P2025 into NotFoundError. Both are asserted here
 * as-is, not as gaps to fix.
 */

import { Prisma } from '@prisma/client'
import { PrismaCertificationWriteRepository } from './PrismaCertificationWriteRepository'
import { Certification } from '../../../../domain/entities/Certification'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { PrismaService } from '../../prisma/prisma.service'

const mockClient = {
    certification: {
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
    name: 'AWS Certified Solutions Architect',
    url: 'https://aws.amazon.com/verify/abc123',
    isPublished: true,
    startDate: new Date('2025-01-01T00:00:00.000Z'),
    endDate: new Date('2028-01-01T00:00:00.000Z'),
    userId: 1,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
})

describe('PrismaCertificationWriteRepository', () => {
    let repo: PrismaCertificationWriteRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaCertificationWriteRepository(mockPrisma as unknown as PrismaService)
    })

    describe('create', () => {
        it('passes the input straight through as Prisma create data', async () => {
            const input = {
                name: 'AWS Certified Solutions Architect',
                url: 'https://aws.amazon.com/verify/abc123',
                isPublished: true,
                startDate: new Date('2025-01-01'),
                endDate: new Date('2028-01-01'),
                userId: 1,
            }
            mockClient.certification.create.mockResolvedValue(makeRow())

            await repo.create(input)

            expect(mockClient.certification.create).toHaveBeenCalledWith({ data: input })
        })

        it('maps the created row to a Certification entity', async () => {
            const row = makeRow()
            mockClient.certification.create.mockResolvedValue(row)

            const result = await repo.create({
                name: row.name,
                url: row.url,
                isPublished: row.isPublished,
                startDate: row.startDate,
                endDate: row.endDate,
                userId: row.userId,
            })

            expect(result).toEqual(
                new Certification(
                    1,
                    row.name,
                    row.url,
                    true,
                    row.startDate,
                    row.endDate,
                    1,
                    row.createdAt,
                    row.updatedAt,
                ),
            )
        })
    })

    describe('update', () => {
        it('updates by id with the given data', async () => {
            mockClient.certification.update.mockResolvedValue(makeRow({ name: 'Updated' }))

            await repo.update(1, { name: 'Updated' })

            expect(mockClient.certification.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { name: 'Updated' },
            })
        })

        it('maps the updated row to a Certification entity', async () => {
            mockClient.certification.update.mockResolvedValue(makeRow({ name: 'Updated' }))

            const result = await repo.update(1, { name: 'Updated' })

            expect(result.name).toBe('Updated')
            expect(result).toBeInstanceOf(Certification)
        })

        it('translates a P2025 record-not-found error into NotFoundError naming the id', async () => {
            mockClient.certification.update.mockRejectedValue(makeKnownError('P2025'))

            await expect(repo.update(999, { name: 'x' })).rejects.toThrow(
                new NotFoundError('Certification not found: 999'),
            )
        })

        it('re-throws any other Prisma error code unchanged', async () => {
            const error = makeKnownError('P2002')
            mockClient.certification.update.mockRejectedValue(error)

            await expect(repo.update(1, { name: 'x' })).rejects.toBe(error)
        })

        it('re-throws a non-Prisma error unchanged', async () => {
            const error = new Error('connection reset')
            mockClient.certification.update.mockRejectedValue(error)

            await expect(repo.update(1, { name: 'x' })).rejects.toBe(error)
        })
    })

    describe('delete', () => {
        it('deletes by id', async () => {
            mockClient.certification.delete.mockResolvedValue(makeRow())

            await repo.delete(1)

            expect(mockClient.certification.delete).toHaveBeenCalledWith({ where: { id: 1 } })
        })

        it('translates a P2025 record-not-found error into NotFoundError naming the id', async () => {
            mockClient.certification.delete.mockRejectedValue(makeKnownError('P2025'))

            await expect(repo.delete(999)).rejects.toThrow(new NotFoundError('Certification not found: 999'))
        })

        it('re-throws any other error unchanged', async () => {
            const error = new Error('connection reset')
            mockClient.certification.delete.mockRejectedValue(error)

            await expect(repo.delete(1)).rejects.toBe(error)
        })
    })
})
