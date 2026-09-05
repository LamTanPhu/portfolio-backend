/**
 * @fileoverview PrismaContactRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these. This class implements both the write and
 * read ports in one file, so both are covered here together.
 *
 * Two things get special attention: delete() returns a boolean rather than
 * throwing on a missing row (the one write repo in the app that does this —
 * every sibling throws NotFoundError instead), and findPaginated() runs its
 * findMany + count as a Promise.all rather than sequentially.
 */

import { Prisma } from '@prisma/client'
import { PrismaContactRepository } from './PrismaContactRepository'
import { ContactMe } from '../../../../domain/entities/ContactMe'
import type { PrismaService } from '../../prisma/prisma.service'

const mockClient = {
    contactMe: {
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
    },
}

const mockPrisma = { client: mockClient }

const CONTACT_SELECT = {
    id: true,
    name: true,
    email: true,
    message: true,
    ipAddress: true,
    browserInfo: true,
    createdAt: true,
} as const

const makeKnownError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('boom', { code, clientVersion: '5.0.0' })

const makeRow = (overrides = {}) => ({
    id: 1,
    name: 'Jane Visitor',
    email: 'jane@visitor.com',
    message: 'Loved your portfolio!',
    ipAddress: '203.0.113.5',
    browserInfo: 'Mozilla/5.0',
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    ...overrides,
})

describe('PrismaContactRepository', () => {
    let repo: PrismaContactRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaContactRepository(mockPrisma as unknown as PrismaService)
    })

    describe('save', () => {
        it('creates a row, never trusting a client-provided createdAt', async () => {
            mockClient.contactMe.create.mockResolvedValue(makeRow())

            await repo.save({
                name: 'Jane Visitor',
                email: 'jane@visitor.com',
                message: 'Loved your portfolio!',
                ipAddress: '203.0.113.5',
                browserInfo: 'Mozilla/5.0',
                // Deliberately a date Prisma would never generate on its own —
                // proves the repo strips/ignores a client-supplied createdAt
                // rather than forwarding it into the create() call below.
                createdAt: new Date('2099-01-01T00:00:00.000Z'),
            })

            expect(mockClient.contactMe.create).toHaveBeenCalledWith({
                data: {
                    name: 'Jane Visitor',
                    email: 'jane@visitor.com',
                    message: 'Loved your portfolio!',
                    ipAddress: '203.0.113.5',
                    browserInfo: 'Mozilla/5.0',
                },
                select: CONTACT_SELECT,
            })
        })

        it('maps the created row to a ContactMe entity', async () => {
            const row = makeRow()
            mockClient.contactMe.create.mockResolvedValue(row)

            const result = await repo.save({
                name: row.name,
                email: row.email,
                message: row.message,
                ipAddress: row.ipAddress,
                browserInfo: row.browserInfo,
                createdAt: row.createdAt,
            })

            expect(result).toEqual(
                new ContactMe(1, row.name, row.email, row.message, row.ipAddress, row.browserInfo, row.createdAt),
            )
        })
    })

    describe('delete', () => {
        it('returns true when the row was deleted', async () => {
            mockClient.contactMe.delete.mockResolvedValue(makeRow())

            const result = await repo.delete(1)

            expect(mockClient.contactMe.delete).toHaveBeenCalledWith({ where: { id: 1 } })
            expect(result).toBe(true)
        })

        it('returns false (not a thrown error) when the row does not exist — unlike every other write repo', async () => {
            mockClient.contactMe.delete.mockRejectedValue(makeKnownError('P2025'))

            const result = await repo.delete(999)

            expect(result).toBe(false)
        })

        it('re-throws any other Prisma error code unchanged', async () => {
            const error = makeKnownError('P2003')
            mockClient.contactMe.delete.mockRejectedValue(error)

            await expect(repo.delete(1)).rejects.toBe(error)
        })

        it('re-throws a non-Prisma error unchanged', async () => {
            const error = new Error('connection reset')
            mockClient.contactMe.delete.mockRejectedValue(error)

            await expect(repo.delete(1)).rejects.toBe(error)
        })
    })

    describe('deleteOlderThan', () => {
        it('deletes all rows created before the cutoff in a single query', async () => {
            const cutoff = new Date('2026-01-01T00:00:00.000Z')
            mockClient.contactMe.deleteMany.mockResolvedValue({ count: 4 })

            await repo.deleteOlderThan(cutoff)

            expect(mockClient.contactMe.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: cutoff } } })
        })
    })

    describe('findPaginated', () => {
        it('runs findMany and count concurrently, not sequentially', async () => {
            let findManyResolved = false
            mockClient.contactMe.findMany.mockImplementation(
                () =>
                    new Promise((resolve) =>
                        setTimeout(() => {
                            findManyResolved = true
                            resolve([])
                        }, 10),
                    ),
            )
            mockClient.contactMe.count.mockImplementation(() => {
                // If findMany were awaited first (sequential), this would already be true.
                expect(findManyResolved).toBe(false)
                return Promise.resolve(0)
            })

            await repo.findPaginated()
        })

        it('orders by id descending and defaults to a limit of 20', async () => {
            mockClient.contactMe.findMany.mockResolvedValue([])
            mockClient.contactMe.count.mockResolvedValue(0)

            await repo.findPaginated()

            expect(mockClient.contactMe.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ orderBy: { id: 'desc' }, take: 20, where: undefined }),
            )
        })

        it('filters by id < cursor when a cursor is given', async () => {
            mockClient.contactMe.findMany.mockResolvedValue([])
            mockClient.contactMe.count.mockResolvedValue(0)

            await repo.findPaginated(50, 10)

            expect(mockClient.contactMe.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: { lt: 50 } } }),
            )
        })

        it('clamps limit to 100 when a larger value is requested', async () => {
            mockClient.contactMe.findMany.mockResolvedValue([])
            mockClient.contactMe.count.mockResolvedValue(0)

            await repo.findPaginated(undefined, 500)

            expect(mockClient.contactMe.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }))
        })

        it('clamps limit to a minimum of 1', async () => {
            mockClient.contactMe.findMany.mockResolvedValue([])
            mockClient.contactMe.count.mockResolvedValue(0)

            await repo.findPaginated(undefined, -3)

            expect(mockClient.contactMe.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 1 }))
        })

        it('sets nextCursor to the last row id when the page is full', async () => {
            mockClient.contactMe.findMany.mockResolvedValue([makeRow({ id: 10 }), makeRow({ id: 9 })])
            mockClient.contactMe.count.mockResolvedValue(30)

            const result = await repo.findPaginated(undefined, 2)

            expect(result.nextCursor).toBe(9)
            expect(result.total).toBe(30)
        })

        it('sets nextCursor to null when the page is short (last page)', async () => {
            mockClient.contactMe.findMany.mockResolvedValue([makeRow({ id: 1 })])
            mockClient.contactMe.count.mockResolvedValue(1)

            const result = await repo.findPaginated(undefined, 20)

            expect(result.nextCursor).toBeNull()
        })

        it('maps every row to a ContactMe entity', async () => {
            mockClient.contactMe.findMany.mockResolvedValue([makeRow()])
            mockClient.contactMe.count.mockResolvedValue(1)

            const result = await repo.findPaginated()

            expect(result.items).toEqual([
                new ContactMe(
                    1,
                    'Jane Visitor',
                    'jane@visitor.com',
                    'Loved your portfolio!',
                    '203.0.113.5',
                    'Mozilla/5.0',
                    new Date('2026-02-01T00:00:00.000Z'),
                ),
            ])
        })
    })

    describe('findById', () => {
        it('selects the safe column set and maps a found row', async () => {
            const row = makeRow()
            mockClient.contactMe.findUnique.mockResolvedValue(row)

            const result = await repo.findById(1)

            expect(mockClient.contactMe.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, select: CONTACT_SELECT })
            expect(result).toEqual(
                new ContactMe(1, row.name, row.email, row.message, row.ipAddress, row.browserInfo, row.createdAt),
            )
        })

        it('returns null when no row matches the id', async () => {
            mockClient.contactMe.findUnique.mockResolvedValue(null)

            const result = await repo.findById(999)

            expect(result).toBeNull()
        })
    })
})
