/**
 * @fileoverview PrismaSkillWriteRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these. `Prisma.PrismaClientKnownRequestError` is
 * constructed for real so the repository's own `instanceof` checks
 * exercise the same branch they would against a genuine Prisma error.
 */

import { Prisma } from '@prisma/client'
import { PrismaSkillWriteRepository } from './PrismaSkillWriteRepository'
import { PrismaSkillMapper } from '../../mappers/PrismaSkillMapper'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { PrismaService } from '../../prisma/prisma.service'
import type { SkillCategory } from '@prisma/client'

const mockClient = {
    skill: {
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
    name: 'TypeScript',
    imageUrl: 'https://cdn.example.com/typescript.svg',
    category: 'backend' as SkillCategory,
    isPublic: true,
    userId: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
})

describe('PrismaSkillWriteRepository', () => {
    let repo: PrismaSkillWriteRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaSkillWriteRepository(mockPrisma as unknown as PrismaService)
    })

    describe('create', () => {
        it('passes the input straight through as Prisma create data', async () => {
            const input = {
                name: 'TypeScript',
                imageUrl: 'https://cdn.example.com/typescript.svg',
                category: 'backend' as const,
                isPublic: true,
                userId: 1,
            }
            mockClient.skill.create.mockResolvedValue(makeRow())

            await repo.create(input)

            expect(mockClient.skill.create).toHaveBeenCalledWith({ data: input })
        })

        it('maps the created row via PrismaSkillMapper', async () => {
            const row = makeRow()
            mockClient.skill.create.mockResolvedValue(row)

            const result = await repo.create({
                name: row.name,
                imageUrl: row.imageUrl,
                category: row.category,
                isPublic: row.isPublic,
                userId: row.userId,
            })

            expect(result).toEqual(PrismaSkillMapper.toDomain(row))
        })
    })

    describe('update', () => {
        it('updates by id with the given data', async () => {
            mockClient.skill.update.mockResolvedValue(makeRow({ name: 'Rust' }))

            await repo.update(1, { name: 'Rust' })

            expect(mockClient.skill.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { name: 'Rust' } })
        })

        it('maps the updated row via PrismaSkillMapper', async () => {
            const row = makeRow({ name: 'Rust' })
            mockClient.skill.update.mockResolvedValue(row)

            const result = await repo.update(1, { name: 'Rust' })

            expect(result).toEqual(PrismaSkillMapper.toDomain(row))
        })

        it('translates a P2025 record-not-found error into NotFoundError naming the id', async () => {
            mockClient.skill.update.mockRejectedValue(makeKnownError('P2025'))

            await expect(repo.update(999, { name: 'x' })).rejects.toThrow(new NotFoundError('Skill not found: 999'))
        })

        it('re-throws any other Prisma error code unchanged', async () => {
            const error = makeKnownError('P2002')
            mockClient.skill.update.mockRejectedValue(error)

            await expect(repo.update(1, { name: 'x' })).rejects.toBe(error)
        })
    })

    describe('delete', () => {
        it('deletes by id', async () => {
            mockClient.skill.delete.mockResolvedValue(makeRow())

            await repo.delete(1)

            expect(mockClient.skill.delete).toHaveBeenCalledWith({ where: { id: 1 } })
        })

        it('translates a P2025 record-not-found error into NotFoundError naming the id', async () => {
            mockClient.skill.delete.mockRejectedValue(makeKnownError('P2025'))

            await expect(repo.delete(999)).rejects.toThrow(new NotFoundError('Skill not found: 999'))
        })

        it('re-throws a non-Prisma error unchanged', async () => {
            const error = new Error('connection reset')
            mockClient.skill.delete.mockRejectedValue(error)

            await expect(repo.delete(1)).rejects.toBe(error)
        })
    })
})
