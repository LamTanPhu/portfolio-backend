/**
 * @fileoverview PrismaSkillReadRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these.
 */

import { PrismaSkillReadRepository } from './PrismaSkillReadRepository'
import { PrismaSkillMapper } from '../../mappers/PrismaSkillMapper'
import type { PrismaService } from '../../prisma/prisma.service'
import type { SkillCategory } from '@prisma/client'

const mockClient = {
    skill: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
    },
}

const mockPrisma = { client: mockClient }

const makeListRow = (overrides = {}) => ({
    id: 1,
    name: 'TypeScript',
    imageUrl: 'https://cdn.example.com/typescript.svg',
    category: 'backend' as SkillCategory,
    ...overrides,
})

const makeFullRow = (overrides = {}) => ({
    id: 1,
    name: 'TypeScript',
    imageUrl: 'https://cdn.example.com/typescript.svg',
    category: 'backend' as SkillCategory,
    isPublic: true,
    userId: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
})

describe('PrismaSkillReadRepository', () => {
    let repo: PrismaSkillReadRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaSkillReadRepository(mockPrisma as unknown as PrismaService)
    })

    describe('findPublished', () => {
        it('filters to isPublic and orders by category ascending', async () => {
            mockClient.skill.findMany.mockResolvedValue([makeListRow()])

            await repo.findPublished()

            expect(mockClient.skill.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { isPublic: true }, orderBy: { category: 'asc' } }),
            )
        })

        it('returns the DTO shape unchanged from the selected columns', async () => {
            mockClient.skill.findMany.mockResolvedValue([makeListRow()])

            const result = await repo.findPublished()

            expect(result).toEqual([makeListRow()])
        })
    })

    describe('findAll', () => {
        it('applies no where filter (includes hidden skills)', async () => {
            mockClient.skill.findMany.mockResolvedValue([makeListRow()])

            await repo.findAll()

            const callArgs = (mockClient.skill.findMany.mock.calls[0] as unknown[])[0] as Record<string, unknown>
            expect(callArgs.where).toBeUndefined()
        })
    })

    describe('findById', () => {
        it('maps a found row via PrismaSkillMapper', async () => {
            const row = makeFullRow()
            mockClient.skill.findUnique.mockResolvedValue(row)

            const result = await repo.findById(1)

            expect(mockClient.skill.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })
            expect(result).toEqual(PrismaSkillMapper.toDomain(row))
        })

        it('returns null when no row matches the id', async () => {
            mockClient.skill.findUnique.mockResolvedValue(null)

            const result = await repo.findById(999)

            expect(result).toBeNull()
        })
    })
})
