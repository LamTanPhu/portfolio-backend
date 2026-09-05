/**
 * @fileoverview PrismaCertificationReadRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these.
 */

import { PrismaCertificationReadRepository } from './PrismaCertificationReadRepository'
import type { PrismaService } from '../../prisma/prisma.service'

const mockClient = {
    certification: {
        findMany: jest.fn(),
    },
}

const mockPrisma = { client: mockClient }

const makeRow = (overrides = {}) => ({
    id: 1,
    name: 'AWS Certified Solutions Architect',
    url: 'https://aws.amazon.com/verify/abc123',
    startDate: new Date('2025-01-01T00:00:00.000Z'),
    endDate: new Date('2028-01-01T00:00:00.000Z'),
    ...overrides,
})

describe('PrismaCertificationReadRepository', () => {
    let repo: PrismaCertificationReadRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaCertificationReadRepository(mockPrisma as unknown as PrismaService)
    })

    it('filters to isPublished and orders by startDate descending', async () => {
        mockClient.certification.findMany.mockResolvedValue([makeRow()])

        await repo.findPublished()

        expect(mockClient.certification.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { isPublished: true }, orderBy: { startDate: 'desc' } }),
        )
    })

    it('selects only the public-facing columns, never isPublished/userId internals', async () => {
        mockClient.certification.findMany.mockResolvedValue([makeRow()])

        await repo.findPublished()

        expect(mockClient.certification.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                select: { id: true, name: true, url: true, startDate: true, endDate: true },
            }),
        )
    })

    it('maps dates to ISO strings', async () => {
        mockClient.certification.findMany.mockResolvedValue([makeRow()])

        const result = await repo.findPublished()

        expect(result).toEqual([
            {
                id: 1,
                name: 'AWS Certified Solutions Architect',
                url: 'https://aws.amazon.com/verify/abc123',
                startDate: '2025-01-01T00:00:00.000Z',
                endDate: '2028-01-01T00:00:00.000Z',
            },
        ])
    })

    it('maps a null endDate to null rather than throwing on .toISOString()', async () => {
        mockClient.certification.findMany.mockResolvedValue([makeRow({ endDate: null })])

        const result = await repo.findPublished()

        expect(result[0].endDate).toBeNull()
    })

    it('returns an empty array when there are no published certifications', async () => {
        mockClient.certification.findMany.mockResolvedValue([])

        const result = await repo.findPublished()

        expect(result).toEqual([])
    })
})
