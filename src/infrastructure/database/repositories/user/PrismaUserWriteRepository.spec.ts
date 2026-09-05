/**
 * @fileoverview PrismaUserWriteRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these. `Prisma.PrismaClientKnownRequestError` is
 * constructed for real so the repository's own `instanceof` checks
 * exercise the same branch they would against a genuine Prisma error.
 *
 * update() selects USER_SAFE_SELECT on its return value too — this is the
 * one write repository in the app whose write call itself carries a
 * `select`, so it gets its own assertion alongside the usual P2025 mapping.
 */

import { Prisma } from '@prisma/client'
import { PrismaUserWriteRepository } from './PrismaUserWriteRepository'
import { USER_SAFE_SELECT } from '../../mappers/PrismaUserMapper'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { PrismaService } from '../../prisma/prisma.service'

const mockClient = {
    user: {
        update: jest.fn(),
    },
}

const mockPrisma = { client: mockClient }

const makeKnownError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('boom', { code, clientVersion: '5.0.0' })

const makeRow = (overrides = {}) => ({
    id: 1,
    firstname: 'Jane',
    lastname: 'Doe',
    email: 'jane@example.com',
    aboutme: 'Backend engineer.',
    lastLogin: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date('2020-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
})

describe('PrismaUserWriteRepository', () => {
    let repo: PrismaUserWriteRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaUserWriteRepository(mockPrisma as unknown as PrismaService)
    })

    describe('update', () => {
        it('updates by id and selects USER_SAFE_SELECT on the return value', async () => {
            mockClient.user.update.mockResolvedValue(makeRow({ firstname: 'Janet' }))

            await repo.update(1, { firstname: 'Janet' })

            expect(mockClient.user.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { firstname: 'Janet' },
                select: USER_SAFE_SELECT,
            })
        })

        it('maps the updated row to a User entity, never exposing hashPassword', async () => {
            mockClient.user.update.mockResolvedValue(makeRow({ firstname: 'Janet' }))

            const result = await repo.update(1, { firstname: 'Janet' })

            expect(result.firstname).toBe('Janet')
            expect(result).not.toHaveProperty('hashPassword')
        })

        it('translates a P2025 record-not-found error into NotFoundError naming the id', async () => {
            mockClient.user.update.mockRejectedValue(makeKnownError('P2025'))

            await expect(repo.update(999, { firstname: 'x' })).rejects.toThrow(new NotFoundError('User not found: 999'))
        })

        it('re-throws any other Prisma error code unchanged', async () => {
            const error = makeKnownError('P2002')
            mockClient.user.update.mockRejectedValue(error)

            await expect(repo.update(1, { firstname: 'x' })).rejects.toBe(error)
        })

        it('re-throws a non-Prisma error unchanged', async () => {
            const error = new Error('connection reset')
            mockClient.user.update.mockRejectedValue(error)

            await expect(repo.update(1, { firstname: 'x' })).rejects.toBe(error)
        })
    })
})
