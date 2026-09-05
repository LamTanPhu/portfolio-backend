/**
 * @fileoverview PrismaSocialAccountWriteRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these. `Prisma.PrismaClientKnownRequestError` is
 * constructed for real so the repository's own `instanceof` checks
 * exercise the same branch they would against a genuine Prisma error.
 */

import { Prisma } from '@prisma/client'
import { PrismaSocialAccountWriteRepository } from './PrismaSocialAccountWriteRepository'
import { PrismaSocialAccountMapper } from '../../mappers/PrismaSocialAccountMapper'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { PrismaService } from '../../prisma/prisma.service'

const mockClient = {
    socialAccount: {
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
    name: 'GitHub',
    url: 'https://github.com/me',
    imageUrl: 'https://cdn.example.com/github.svg',
    isPublic: true,
    userId: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
})

describe('PrismaSocialAccountWriteRepository', () => {
    let repo: PrismaSocialAccountWriteRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaSocialAccountWriteRepository(mockPrisma as unknown as PrismaService)
    })

    describe('create', () => {
        it('passes the input straight through as Prisma create data', async () => {
            const input = {
                name: 'GitHub',
                url: 'https://github.com/me',
                imageUrl: 'https://cdn.example.com/github.svg',
                isPublic: true,
                userId: 1,
            }
            mockClient.socialAccount.create.mockResolvedValue(makeRow())

            await repo.create(input)

            expect(mockClient.socialAccount.create).toHaveBeenCalledWith({ data: input })
        })

        it('maps the created row via PrismaSocialAccountMapper', async () => {
            const row = makeRow()
            mockClient.socialAccount.create.mockResolvedValue(row)

            const result = await repo.create({
                name: row.name,
                url: row.url,
                imageUrl: row.imageUrl,
                isPublic: row.isPublic,
                userId: row.userId,
            })

            expect(result).toEqual(PrismaSocialAccountMapper.toDomain(row))
        })
    })

    describe('update', () => {
        it('updates by id with the given data', async () => {
            mockClient.socialAccount.update.mockResolvedValue(makeRow({ name: 'LinkedIn' }))

            await repo.update(1, { name: 'LinkedIn' })

            expect(mockClient.socialAccount.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { name: 'LinkedIn' },
            })
        })

        it('maps the updated row via PrismaSocialAccountMapper', async () => {
            const row = makeRow({ name: 'LinkedIn' })
            mockClient.socialAccount.update.mockResolvedValue(row)

            const result = await repo.update(1, { name: 'LinkedIn' })

            expect(result).toEqual(PrismaSocialAccountMapper.toDomain(row))
        })

        it('translates a P2025 record-not-found error into NotFoundError naming the id', async () => {
            mockClient.socialAccount.update.mockRejectedValue(makeKnownError('P2025'))

            await expect(repo.update(999, { name: 'x' })).rejects.toThrow(
                new NotFoundError('Social account not found: 999'),
            )
        })

        it('re-throws any other Prisma error code unchanged', async () => {
            const error = makeKnownError('P2002')
            mockClient.socialAccount.update.mockRejectedValue(error)

            await expect(repo.update(1, { name: 'x' })).rejects.toBe(error)
        })
    })

    describe('delete', () => {
        it('deletes by id', async () => {
            mockClient.socialAccount.delete.mockResolvedValue(makeRow())

            await repo.delete(1)

            expect(mockClient.socialAccount.delete).toHaveBeenCalledWith({ where: { id: 1 } })
        })

        it('translates a P2025 record-not-found error into NotFoundError naming the id', async () => {
            mockClient.socialAccount.delete.mockRejectedValue(makeKnownError('P2025'))

            await expect(repo.delete(999)).rejects.toThrow(new NotFoundError('Social account not found: 999'))
        })

        it('re-throws a non-Prisma error unchanged', async () => {
            const error = new Error('connection reset')
            mockClient.socialAccount.delete.mockRejectedValue(error)

            await expect(repo.delete(1)).rejects.toBe(error)
        })
    })
})
