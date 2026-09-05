/**
 * @fileoverview PrismaRevokedTokenRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these.
 *
 * Key behaviors tested:
 * - revoke()/isRevoked() use the transactional client when one is passed,
 *   and fall back to the global client otherwise (the `db(tx)` pattern this
 *   repo shares with PrismaBlogWriteRepository).
 * - deleteExpired() batches in pages of 1,000 and stops as soon as a page
 *   comes back smaller than the batch size — this loop has no test coverage
 *   anywhere else, so a regression here (e.g. an off-by-one causing an
 *   infinite loop or early exit) would only surface in production.
 */

import { PrismaRevokedTokenRepository } from './PrismaRevokedTokenRepository'
import type { PrismaService } from '../prisma/prisma.service'
import type { TransactionalClient } from '../../../application/ports/IUnitOfWork'

const mockGlobalClient = {
    revokedToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
    },
}

const mockPrisma = {
    client: mockGlobalClient,
}

describe('PrismaRevokedTokenRepository', () => {
    let repo: PrismaRevokedTokenRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaRevokedTokenRepository(mockPrisma as unknown as PrismaService)
    })

    describe('revoke', () => {
        it('creates a row on the global client when no transaction is given', async () => {
            mockGlobalClient.revokedToken.create.mockResolvedValue({ id: 1 })
            const expiresAt = new Date('2026-03-01T00:00:00.000Z')

            await repo.revoke('jti-123', expiresAt)

            expect(mockGlobalClient.revokedToken.create).toHaveBeenCalledWith({
                data: { jti: 'jti-123', expiresAt },
            })
        })

        it('creates the row on the transactional client when one is provided', async () => {
            const mockTx = { revokedToken: { create: jest.fn().mockResolvedValue({ id: 1 }) } }
            const expiresAt = new Date('2026-03-01T00:00:00.000Z')

            await repo.revoke('jti-123', expiresAt, mockTx as unknown as TransactionalClient)

            expect(mockTx.revokedToken.create).toHaveBeenCalledWith({ data: { jti: 'jti-123', expiresAt } })
            expect(mockGlobalClient.revokedToken.create).not.toHaveBeenCalled()
        })
    })

    describe('isRevoked', () => {
        it('selects only the jti column and returns true when a row is found', async () => {
            mockGlobalClient.revokedToken.findUnique.mockResolvedValue({ jti: 'jti-123' })

            const result = await repo.isRevoked('jti-123')

            expect(mockGlobalClient.revokedToken.findUnique).toHaveBeenCalledWith({
                where: { jti: 'jti-123' },
                select: { jti: true },
            })
            expect(result).toBe(true)
        })

        it('returns false when no row is found — token was never revoked', async () => {
            mockGlobalClient.revokedToken.findUnique.mockResolvedValue(null)

            const result = await repo.isRevoked('never-revoked')

            expect(result).toBe(false)
        })
    })

    describe('deleteExpired', () => {
        it('does nothing further when the first batch is already empty', async () => {
            mockGlobalClient.revokedToken.findMany.mockResolvedValue([])

            await repo.deleteExpired()

            expect(mockGlobalClient.revokedToken.findMany).toHaveBeenCalledTimes(1)
            expect(mockGlobalClient.revokedToken.deleteMany).not.toHaveBeenCalled()
        })

        it('deletes a single partial batch (smaller than 1,000) and stops', async () => {
            const smallBatch = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }))
            mockGlobalClient.revokedToken.findMany.mockResolvedValueOnce(smallBatch)
            mockGlobalClient.revokedToken.deleteMany.mockResolvedValue({ count: 5 })

            await repo.deleteExpired()

            expect(mockGlobalClient.revokedToken.findMany).toHaveBeenCalledTimes(1)
            expect(mockGlobalClient.revokedToken.deleteMany).toHaveBeenCalledWith({
                where: { id: { in: [1, 2, 3, 4, 5] } },
            })
        })

        it('keeps paging while a full 1,000-row batch keeps coming back, and stops on the first short page', async () => {
            const fullBatch = Array.from({ length: 1000 }, (_, i) => ({ id: i + 1 }))
            const shortBatch = Array.from({ length: 3 }, (_, i) => ({ id: 1000 + i + 1 }))

            mockGlobalClient.revokedToken.findMany.mockResolvedValueOnce(fullBatch).mockResolvedValueOnce(shortBatch)
            mockGlobalClient.revokedToken.deleteMany.mockResolvedValue({ count: 0 })

            await repo.deleteExpired()

            expect(mockGlobalClient.revokedToken.findMany).toHaveBeenCalledTimes(2)
            expect(mockGlobalClient.revokedToken.deleteMany).toHaveBeenCalledTimes(2)
        })

        it('caps each findMany page at 1,000 rows and filters by expiresAt in the past', async () => {
            mockGlobalClient.revokedToken.findMany.mockResolvedValue([])

            await repo.deleteExpired()

            const callArgs = (mockGlobalClient.revokedToken.findMany.mock.calls[0] as unknown[])[0] as {
                where: { expiresAt: { lt: Date } }
                select: { id: boolean }
                take: number
            }
            expect(callArgs.take).toBe(1000)
            expect(callArgs.select).toEqual({ id: true })
            expect(callArgs.where.expiresAt.lt).toBeInstanceOf(Date)
        })
    })
})
