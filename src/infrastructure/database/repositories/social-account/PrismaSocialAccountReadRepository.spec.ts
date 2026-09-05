/**
 * @fileoverview PrismaSocialAccountReadRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these. Unlike its siblings, this repository's
 * findAll()/findById() return full domain entities (not a DTO passthrough)
 * — only findPublic() is DTO-shaped, since it's the one path exposed to
 * unauthenticated visitors.
 */

import { PrismaSocialAccountReadRepository } from './PrismaSocialAccountReadRepository'
import { PrismaSocialAccountMapper } from '../../mappers/PrismaSocialAccountMapper'
import type { PrismaService } from '../../prisma/prisma.service'

const mockClient = {
    socialAccount: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
    },
}

const mockPrisma = { client: mockClient }

const makeListRow = (overrides = {}) => ({
    id: 1,
    name: 'GitHub',
    url: 'https://github.com/me',
    imageUrl: 'https://cdn.example.com/github.svg',
    isPublic: true,
    ...overrides,
})

const makeFullRow = (overrides = {}) => ({
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

describe('PrismaSocialAccountReadRepository', () => {
    let repo: PrismaSocialAccountReadRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaSocialAccountReadRepository(mockPrisma as unknown as PrismaService)
    })

    describe('findPublic', () => {
        it('filters to isPublic and orders by name ascending', async () => {
            mockClient.socialAccount.findMany.mockResolvedValue([makeListRow()])

            await repo.findPublic()

            expect(mockClient.socialAccount.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { isPublic: true }, orderBy: { name: 'asc' } }),
            )
        })

        it('returns the DTO shape unchanged from the selected columns', async () => {
            mockClient.socialAccount.findMany.mockResolvedValue([makeListRow()])

            const result = await repo.findPublic()

            expect(result).toEqual([makeListRow()])
        })
    })

    describe('findAll', () => {
        it('applies no where filter (includes private accounts) and maps every row to a domain entity', async () => {
            const row = makeFullRow()
            mockClient.socialAccount.findMany.mockResolvedValue([row])

            const result = await repo.findAll()

            const callArgs = mockClient.socialAccount.findMany.mock.calls[0] as Record<string, unknown>
            expect(callArgs.where).toBeUndefined()
            expect(result).toEqual([PrismaSocialAccountMapper.toDomain(row)])
        })
    })

    describe('findById', () => {
        it('maps a found row via PrismaSocialAccountMapper', async () => {
            const row = makeFullRow()
            mockClient.socialAccount.findUnique.mockResolvedValue(row)

            const result = await repo.findById(1)

            expect(mockClient.socialAccount.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })
            expect(result).toEqual(PrismaSocialAccountMapper.toDomain(row))
        })

        it('returns null when no row matches the id', async () => {
            mockClient.socialAccount.findUnique.mockResolvedValue(null)

            const result = await repo.findById(999)

            expect(result).toBeNull()
        })
    })
})
