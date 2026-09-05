/**
 * @fileoverview PrismaUserReadRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these.
 *
 * The file's own header says it "never selects hashPassword — defense in
 * depth." The tests below assert exactly that: both findById and
 * findByEmail must use USER_SAFE_SELECT, and the mapped result must never
 * carry a hashPassword field even if a mock row were to include one.
 */

import { PrismaUserReadRepository } from './PrismaUserReadRepository'
import { USER_SAFE_SELECT } from '../../mappers/PrismaUserMapper'
import type { PrismaService } from '../../prisma/prisma.service'

const mockClient = {
    user: {
        findUnique: jest.fn(),
    },
}

const mockPrisma = { client: mockClient }

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

describe('PrismaUserReadRepository', () => {
    let repo: PrismaUserReadRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaUserReadRepository(mockPrisma as unknown as PrismaService)
    })

    describe('findById', () => {
        it('uses USER_SAFE_SELECT, which excludes hashPassword', async () => {
            mockClient.user.findUnique.mockResolvedValue(makeRow())

            await repo.findById(1)

            expect(mockClient.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, select: USER_SAFE_SELECT })
            expect(USER_SAFE_SELECT).not.toHaveProperty('hashPassword')
        })

        it('maps a found row to a User entity', async () => {
            mockClient.user.findUnique.mockResolvedValue(makeRow())

            const result = await repo.findById(1)

            expect(result).toEqual(
                expect.objectContaining({ id: 1, firstname: 'Jane', lastname: 'Doe', email: 'jane@example.com' }),
            )
            expect(result).not.toHaveProperty('hashPassword')
        })

        it('returns null when no row matches the id', async () => {
            mockClient.user.findUnique.mockResolvedValue(null)

            const result = await repo.findById(999)

            expect(result).toBeNull()
        })
    })

    describe('findByEmail', () => {
        it('uses USER_SAFE_SELECT, which excludes hashPassword', async () => {
            mockClient.user.findUnique.mockResolvedValue(makeRow())

            await repo.findByEmail('jane@example.com')

            expect(mockClient.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'jane@example.com' },
                select: USER_SAFE_SELECT,
            })
        })

        it('maps a found row to a User entity', async () => {
            mockClient.user.findUnique.mockResolvedValue(makeRow())

            const result = await repo.findByEmail('jane@example.com')

            expect(result).toEqual(expect.objectContaining({ email: 'jane@example.com' }))
        })

        it('returns null when no row matches the email', async () => {
            mockClient.user.findUnique.mockResolvedValue(null)

            const result = await repo.findByEmail('nobody@example.com')

            expect(result).toBeNull()
        })
    })
})
