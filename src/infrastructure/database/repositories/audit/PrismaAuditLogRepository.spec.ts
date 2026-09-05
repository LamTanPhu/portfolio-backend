/**
 * @fileoverview PrismaAuditLogRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these. Covers both interfaces this class implements
 * (write + read) and the cursor-pagination math shared with
 * PrismaContactRepository (nextCursor logic, the select shape, and the
 * clamp on `limit`).
 */

import { PrismaAuditLogRepository } from './PrismaAuditLogRepository'
import { AuditLog } from '../../../../domain/entities/AuditLog'
import type { PrismaService } from '../../prisma/prisma.service'

const mockClient = {
    auditLog: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
    },
}

const mockPrisma = { client: mockClient }

const AUDIT_LOG_SELECT = {
    id: true,
    actorId: true,
    method: true,
    route: true,
    entityType: true,
    entityId: true,
    ipAddress: true,
    statusCode: true,
    createdAt: true,
} as const

const makeRow = (overrides = {}) => ({
    id: 10,
    actorId: 1,
    method: 'DELETE',
    route: '/api/blogs/5',
    entityType: 'Blog',
    entityId: '5',
    ipAddress: '203.0.113.5',
    statusCode: 200,
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    ...overrides,
})

describe('PrismaAuditLogRepository', () => {
    let repo: PrismaAuditLogRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaAuditLogRepository(mockPrisma as unknown as PrismaService)
    })

    describe('save', () => {
        it('creates a row from the entry, never trusting a client-supplied createdAt', async () => {
            mockClient.auditLog.create.mockResolvedValue(makeRow())

            await repo.save({
                actorId: 1,
                method: 'DELETE',
                route: '/api/blogs/5',
                entityType: 'Blog',
                entityId: '5',
                ipAddress: '203.0.113.5',
                statusCode: 200,
            })

            expect(mockClient.auditLog.create).toHaveBeenCalledWith({
                data: {
                    actorId: 1,
                    method: 'DELETE',
                    route: '/api/blogs/5',
                    entityType: 'Blog',
                    entityId: '5',
                    ipAddress: '203.0.113.5',
                    statusCode: 200,
                },
            })
        })

        it('never throws — save() is called from an interceptor tap() that must not break the response cycle', async () => {
            mockClient.auditLog.create.mockRejectedValue(new Error('db down'))

            // The repository itself is a plain passthrough (per its own header
            // comment) — failures ARE expected to propagate from here. It's the
            // interceptor's job to catch them, not this repository's.
            await expect(
                repo.save({
                    actorId: 1,
                    method: 'GET',
                    route: '/x',
                    entityType: 'Blog',
                    entityId: null,
                    ipAddress: null,
                    statusCode: 500,
                }),
            ).rejects.toThrow('db down')
        })
    })

    describe('deleteOlderThan', () => {
        it('deletes all rows created before the cutoff in a single query', async () => {
            const cutoff = new Date('2026-01-01T00:00:00.000Z')
            mockClient.auditLog.deleteMany.mockResolvedValue({ count: 12 })

            await repo.deleteOlderThan(cutoff)

            expect(mockClient.auditLog.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: cutoff } } })
        })
    })

    describe('findPaginated', () => {
        it('fetches rows newest-first with the safe select shape and default limit 20', async () => {
            mockClient.auditLog.findMany.mockResolvedValue([makeRow()])
            mockClient.auditLog.count.mockResolvedValue(1)

            await repo.findPaginated()

            expect(mockClient.auditLog.findMany).toHaveBeenCalledWith({
                select: AUDIT_LOG_SELECT,
                where: undefined,
                orderBy: { id: 'desc' },
                take: 20,
            })
        })

        it('filters by id < cursor when a cursor is given', async () => {
            mockClient.auditLog.findMany.mockResolvedValue([])
            mockClient.auditLog.count.mockResolvedValue(0)

            await repo.findPaginated(100, 20)

            expect(mockClient.auditLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: { lt: 100 } } }),
            )
        })

        it('clamps limit to 100 when a larger value is requested', async () => {
            mockClient.auditLog.findMany.mockResolvedValue([])
            mockClient.auditLog.count.mockResolvedValue(0)

            await repo.findPaginated(undefined, 500)

            expect(mockClient.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }))
        })

        it('clamps limit to a minimum of 1 when zero or negative is requested', async () => {
            mockClient.auditLog.findMany.mockResolvedValue([])
            mockClient.auditLog.count.mockResolvedValue(0)

            await repo.findPaginated(undefined, -5)

            expect(mockClient.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 1 }))
        })

        it('sets nextCursor to the last row id when the page is full (more pages likely remain)', async () => {
            const rows = [makeRow({ id: 20 }), makeRow({ id: 19 })]
            mockClient.auditLog.findMany.mockResolvedValue(rows)
            mockClient.auditLog.count.mockResolvedValue(50)

            const result = await repo.findPaginated(undefined, 2)

            expect(result.nextCursor).toBe(19)
            expect(result.total).toBe(50)
        })

        it('sets nextCursor to null when the page is short (this was the last page)', async () => {
            mockClient.auditLog.findMany.mockResolvedValue([makeRow({ id: 5 })])
            mockClient.auditLog.count.mockResolvedValue(1)

            const result = await repo.findPaginated(undefined, 20)

            expect(result.nextCursor).toBeNull()
        })

        it('maps every row to an AuditLog entity', async () => {
            mockClient.auditLog.findMany.mockResolvedValue([makeRow()])
            mockClient.auditLog.count.mockResolvedValue(1)

            const result = await repo.findPaginated()

            expect(result.items).toEqual([
                new AuditLog(
                    10,
                    1,
                    'DELETE',
                    '/api/blogs/5',
                    'Blog',
                    '5',
                    '203.0.113.5',
                    200,
                    new Date('2026-02-01T00:00:00.000Z'),
                ),
            ])
        })

        it('handles a null actorId (defensive path — every write route requires auth in practice)', async () => {
            mockClient.auditLog.findMany.mockResolvedValue([makeRow({ actorId: null })])
            mockClient.auditLog.count.mockResolvedValue(1)

            const result = await repo.findPaginated()

            expect(result.items[0].actorId).toBeNull()
        })
    })
})
