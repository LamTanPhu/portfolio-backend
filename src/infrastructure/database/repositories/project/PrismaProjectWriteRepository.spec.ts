/**
 * @fileoverview PrismaProjectWriteRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these. `Prisma.PrismaClientKnownRequestError` is
 * constructed for real so the repository's own `instanceof` checks
 * exercise the same branch they would against a genuine Prisma error.
 */

import { Prisma } from '@prisma/client'
import { PrismaProjectWriteRepository } from './PrismaProjectWriteRepository'
import { ProjectMapper } from '../../mappers/ProjectMapper'
import { ConflictError } from '../../../../domain/errors/ConflictError'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { PrismaService } from '../../prisma/prisma.service'

const mockClient = {
    project: {
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
    name: 'My Portfolio Backend',
    description: 'A clean-architecture NestJS backend.',
    slug: 'my-portfolio-backend',
    techStack: ['NestJS'],
    repoUrl: null,
    liveUrl: null,
    thumbnailUrl: null,
    isPublished: true,
    isOpenSource: true,
    userId: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
})

const makeCreateInput = (overrides = {}) => ({
    name: 'My Portfolio Backend',
    description: 'A clean-architecture NestJS backend.',
    slug: 'my-portfolio-backend',
    techStack: ['NestJS'],
    repoUrl: null,
    liveUrl: null,
    thumbnailUrl: null,
    isPublished: true,
    isOpenSource: true,
    userId: 1,
    ...overrides,
})

describe('PrismaProjectWriteRepository', () => {
    let repo: PrismaProjectWriteRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaProjectWriteRepository(mockPrisma as unknown as PrismaService)
    })

    describe('create', () => {
        it('creates via ProjectMapper.toPrisma', async () => {
            const input = makeCreateInput()
            mockClient.project.create.mockResolvedValue(makeRow())

            await repo.create(input)

            expect(mockClient.project.create).toHaveBeenCalledWith({ data: ProjectMapper.toPrisma(input) })
        })

        it('maps the created row via ProjectMapper.toDomain', async () => {
            const row = makeRow()
            mockClient.project.create.mockResolvedValue(row)

            const result = await repo.create(makeCreateInput())

            expect(result).toEqual(ProjectMapper.toDomain(row))
        })

        it('translates a P2002 unique-constraint error into ConflictError naming the slug', async () => {
            mockClient.project.create.mockRejectedValue(makeKnownError('P2002'))

            await expect(repo.create(makeCreateInput({ slug: 'taken-slug' }))).rejects.toThrow(
                new ConflictError('A project with slug "taken-slug" already exists'),
            )
        })

        it('re-throws any other Prisma error code unchanged', async () => {
            const error = makeKnownError('P2003')
            mockClient.project.create.mockRejectedValue(error)

            await expect(repo.create(makeCreateInput())).rejects.toBe(error)
        })
    })

    describe('update', () => {
        it('passes techStack through unchanged when provided', async () => {
            mockClient.project.update.mockResolvedValue(makeRow())

            await repo.update(1, { techStack: ['Rust', 'Postgres'] })

            expect(mockClient.project.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { techStack: ['Rust', 'Postgres'] },
            })
        })

        it('leaves techStack undefined (no-op for Prisma) when omitted from the payload', async () => {
            mockClient.project.update.mockResolvedValue(makeRow())

            await repo.update(1, { name: 'New Name' })

            expect(mockClient.project.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { name: 'New Name', techStack: undefined },
            })
        })

        it('maps the updated row via ProjectMapper.toDomain', async () => {
            const row = makeRow({ name: 'Updated' })
            mockClient.project.update.mockResolvedValue(row)

            const result = await repo.update(1, { name: 'Updated' })

            expect(result).toEqual(ProjectMapper.toDomain(row))
        })

        it('translates a P2025 record-not-found error into NotFoundError naming the id', async () => {
            mockClient.project.update.mockRejectedValue(makeKnownError('P2025'))

            await expect(repo.update(999, { name: 'x' })).rejects.toThrow(new NotFoundError('Project not found: 999'))
        })

        it('re-throws any other Prisma error code unchanged', async () => {
            const error = makeKnownError('P2002')
            mockClient.project.update.mockRejectedValue(error)

            await expect(repo.update(1, { name: 'x' })).rejects.toBe(error)
        })
    })

    describe('delete', () => {
        it('deletes by id', async () => {
            mockClient.project.delete.mockResolvedValue(makeRow())

            await repo.delete(1)

            expect(mockClient.project.delete).toHaveBeenCalledWith({ where: { id: 1 } })
        })

        it('translates a P2025 record-not-found error into NotFoundError naming the id', async () => {
            mockClient.project.delete.mockRejectedValue(makeKnownError('P2025'))

            await expect(repo.delete(999)).rejects.toThrow(new NotFoundError('Project not found: 999'))
        })

        it('re-throws a non-Prisma error unchanged', async () => {
            const error = new Error('connection reset')
            mockClient.project.delete.mockRejectedValue(error)

            await expect(repo.delete(1)).rejects.toBe(error)
        })
    })
})
