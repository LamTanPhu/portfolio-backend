/**
 * @fileoverview PrismaResumeDownloadRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these.
 */

import { PrismaResumeDownloadRepository } from './PrismaResumeDownloadRepository'
import { ResumeDownload } from '../../../domain/entities/ResumeDownload'
import type { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
    client: {
        resumeDownload: {
            create: jest.fn(),
            findMany: jest.fn(),
            deleteMany: jest.fn(),
        },
    },
}

const makeRow = (overrides = {}) => ({
    id: 1,
    ipAddress: '203.0.113.5',
    browserInfo: 'Mozilla/5.0',
    downloadedAt: new Date('2026-02-01T00:00:00.000Z'),
    ...overrides,
})

describe('PrismaResumeDownloadRepository', () => {
    let repo: PrismaResumeDownloadRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaResumeDownloadRepository(mockPrisma as unknown as PrismaService)
    })

    describe('save', () => {
        it('creates a row with ipAddress and browserInfo, never a client-provided timestamp', async () => {
            mockPrisma.client.resumeDownload.create.mockResolvedValue(makeRow())

            await repo.save({ ipAddress: '203.0.113.5', browserInfo: 'Mozilla/5.0' })

            expect(mockPrisma.client.resumeDownload.create).toHaveBeenCalledWith({
                data: { ipAddress: '203.0.113.5', browserInfo: 'Mozilla/5.0' },
            })
        })

        it('saves a null browserInfo when the client sent no User-Agent', async () => {
            mockPrisma.client.resumeDownload.create.mockResolvedValue(makeRow({ browserInfo: null }))

            await repo.save({ ipAddress: '203.0.113.5', browserInfo: null })

            expect(mockPrisma.client.resumeDownload.create).toHaveBeenCalledWith({
                data: { ipAddress: '203.0.113.5', browserInfo: null },
            })
        })
    })

    describe('findAll', () => {
        it('orders by downloadedAt descending, capped at 500 rows', async () => {
            mockPrisma.client.resumeDownload.findMany.mockResolvedValue([makeRow()])

            await repo.findAll()

            expect(mockPrisma.client.resumeDownload.findMany).toHaveBeenCalledWith({
                orderBy: { downloadedAt: 'desc' },
                take: 500,
            })
        })

        it('maps every row to a ResumeDownload entity', async () => {
            mockPrisma.client.resumeDownload.findMany.mockResolvedValue([makeRow()])

            const result = await repo.findAll()

            expect(result).toEqual([
                new ResumeDownload(1, '203.0.113.5', 'Mozilla/5.0', new Date('2026-02-01T00:00:00.000Z')),
            ])
        })
    })

    describe('deleteOlderThan', () => {
        it('deletes all rows downloaded before the cutoff', async () => {
            const cutoff = new Date('2026-01-01T00:00:00.000Z')
            mockPrisma.client.resumeDownload.deleteMany.mockResolvedValue({ count: 3 })

            await repo.deleteOlderThan(cutoff)

            expect(mockPrisma.client.resumeDownload.deleteMany).toHaveBeenCalledWith({
                where: { downloadedAt: { lt: cutoff } },
            })
        })
    })
})
