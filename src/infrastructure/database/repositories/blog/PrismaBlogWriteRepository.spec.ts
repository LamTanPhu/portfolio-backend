/**
 * @fileoverview PrismaBlogWriteRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these. `Prisma.PrismaClientKnownRequestError` is
 * constructed for real (not a plain object) so the repository's own
 * `instanceof` checks actually exercise the same branch they would against
 * a genuine Prisma error.
 *
 * Covers the `db(tx)` transactional-client pattern (shared with every other
 * write repo that supports a Unit of Work), the P2002 -> ConflictError and
 * P2025 -> NotFoundError translations, and the tags-relation rebuild logic
 * on update (delete-all-then-recreate, but only when tags is actually part
 * of the payload).
 */

import { Prisma } from '@prisma/client'
import { PrismaBlogWriteRepository } from './PrismaBlogWriteRepository'
import { ConflictError } from '../../../../domain/errors/ConflictError'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import { PrismaBlogMapper } from '../../mappers/PrismaBlogMapper'
import type { PrismaService } from '../../prisma/prisma.service'
import type { TransactionalClient } from '../../../../application/ports/IUnitOfWork'

const mockGlobalClient = {
    blog: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
}

const mockPrisma = { client: mockGlobalClient }

const makeKnownError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('boom', { code, clientVersion: '5.0.0' })

const makeRow = (overrides = {}) => ({
    id: 1,
    title: 'A Post',
    slug: 'a-post',
    content: 'Content',
    excerpt: null,
    isPublished: true,
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    userId: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    tags: [{ id: 1, name: 'NestJS', blogId: 1 }],
    ...overrides,
})

const makeCreateInput = (overrides = {}) => ({
    title: 'A Post',
    slug: 'a-post',
    content: 'Content',
    excerpt: null,
    tags: ['NestJS'],
    isPublished: true,
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    userId: 1,
    ...overrides,
})

/**
 * `expect.objectContaining()` is typed to return `any` in @types/jest,
 * which trips `@typescript-eslint/no-unsafe-assignment` whenever it's
 * assigned directly into a property of a typed object literal. Wrapping
 * it here gives the result a concrete type at the call site instead.
 */
const objectContaining = <T extends Record<string, unknown>>(sample: Partial<T>): T =>
    expect.objectContaining(sample) as T

describe('PrismaBlogWriteRepository', () => {
    let repo: PrismaBlogWriteRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaBlogWriteRepository(mockPrisma as unknown as PrismaService)
    })

    describe('create', () => {
        it('creates the tags relation from a plain string array and includes tags in the result', async () => {
            mockGlobalClient.blog.create.mockResolvedValue(makeRow())

            await repo.create(makeCreateInput({ tags: ['NestJS', 'Prisma'] }))

            expect(mockGlobalClient.blog.create).toHaveBeenCalledWith({
                data: objectContaining<{ tags: unknown }>({
                    tags: { create: [{ name: 'NestJS' }, { name: 'Prisma' }] },
                }),
                include: { tags: true },
            })
        })

        it('maps the created row via PrismaBlogMapper', async () => {
            const row = makeRow()
            mockGlobalClient.blog.create.mockResolvedValue(row)

            const result = await repo.create(makeCreateInput())

            expect(result).toEqual(PrismaBlogMapper.toDomain(row))
        })

        it('runs on the transactional client when tx is provided, not the global client', async () => {
            const mockTx = { blog: { create: jest.fn().mockResolvedValue(makeRow()) } }

            await repo.create(makeCreateInput(), mockTx as unknown as TransactionalClient)

            expect(mockTx.blog.create).toHaveBeenCalledTimes(1)
            expect(mockGlobalClient.blog.create).not.toHaveBeenCalled()
        })

        it('translates a P2002 unique-constraint error into ConflictError naming the slug', async () => {
            mockGlobalClient.blog.create.mockRejectedValue(makeKnownError('P2002'))

            await expect(repo.create(makeCreateInput({ slug: 'taken-slug' }))).rejects.toThrow(
                new ConflictError('A blog with slug "taken-slug" already exists'),
            )
        })

        it('re-throws any other Prisma error code unchanged', async () => {
            const error = makeKnownError('P2003')
            mockGlobalClient.blog.create.mockRejectedValue(error)

            await expect(repo.create(makeCreateInput())).rejects.toBe(error)
        })

        it('re-throws a non-Prisma error unchanged', async () => {
            const error = new Error('connection reset')
            mockGlobalClient.blog.create.mockRejectedValue(error)

            await expect(repo.create(makeCreateInput())).rejects.toBe(error)
        })
    })

    describe('update', () => {
        it('rebuilds the tags relation (delete-all then recreate) when tags is part of the payload', async () => {
            mockGlobalClient.blog.update.mockResolvedValue(makeRow())

            await repo.update(1, { title: 'New Title', tags: ['Rust'] })

            expect(mockGlobalClient.blog.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    title: 'New Title',
                    tags: { deleteMany: {}, create: [{ name: 'Rust' }] },
                },
                include: { tags: true },
            })
        })

        it('does not touch the tags relation at all when tags is omitted from the payload', async () => {
            mockGlobalClient.blog.update.mockResolvedValue(makeRow())

            await repo.update(1, { title: 'New Title' })

            expect(mockGlobalClient.blog.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { title: 'New Title' },
                include: { tags: true },
            })
        })

        it('clears all tags when an explicit empty array is passed (distinct from omission)', async () => {
            mockGlobalClient.blog.update.mockResolvedValue(makeRow({ tags: [] }))

            await repo.update(1, { tags: [] })

            expect(mockGlobalClient.blog.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { tags: { deleteMany: {}, create: [] } } }),
            )
        })

        it('runs on the transactional client when tx is provided', async () => {
            const mockTx = { blog: { update: jest.fn().mockResolvedValue(makeRow()) } }

            await repo.update(1, { title: 'x' }, mockTx as unknown as TransactionalClient)

            expect(mockTx.blog.update).toHaveBeenCalledTimes(1)
            expect(mockGlobalClient.blog.update).not.toHaveBeenCalled()
        })

        it('translates a P2025 record-not-found error into NotFoundError naming the id', async () => {
            mockGlobalClient.blog.update.mockRejectedValue(makeKnownError('P2025'))

            await expect(repo.update(999, { title: 'x' })).rejects.toThrow(new NotFoundError('Blog not found: 999'))
        })

        it('re-throws any other Prisma error code unchanged', async () => {
            const error = makeKnownError('P2002')
            mockGlobalClient.blog.update.mockRejectedValue(error)

            await expect(repo.update(1, { title: 'x' })).rejects.toBe(error)
        })
    })

    describe('delete', () => {
        it('deletes by id on the global client when no tx is given', async () => {
            mockGlobalClient.blog.delete.mockResolvedValue(makeRow())

            await repo.delete(1)

            expect(mockGlobalClient.blog.delete).toHaveBeenCalledWith({ where: { id: 1 } })
        })

        it('runs on the transactional client when tx is provided', async () => {
            const mockTx = { blog: { delete: jest.fn().mockResolvedValue(makeRow()) } }

            await repo.delete(1, mockTx as unknown as TransactionalClient)

            expect(mockTx.blog.delete).toHaveBeenCalledTimes(1)
            expect(mockGlobalClient.blog.delete).not.toHaveBeenCalled()
        })

        it('translates a P2025 record-not-found error into NotFoundError naming the id', async () => {
            mockGlobalClient.blog.delete.mockRejectedValue(makeKnownError('P2025'))

            await expect(repo.delete(999)).rejects.toThrow(new NotFoundError('Blog not found: 999'))
        })

        it('re-throws any other error unchanged', async () => {
            const error = new Error('connection reset')
            mockGlobalClient.blog.delete.mockRejectedValue(error)

            await expect(repo.delete(1)).rejects.toBe(error)
        })
    })
})
