/**
 * @fileoverview PrismaEducationReadRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these. Unlike Certification/Skill/Project, this
 * findAll() has no isPublished filter — education entries are always shown
 * once created — so that omission is asserted here as intentional.
 */

import { PrismaEducationReadRepository } from './PrismaEducationReadRepository'
import type { PrismaService } from '../../prisma/prisma.service'

const mockClient = {
    education: {
        findMany: jest.fn(),
    },
}

const mockPrisma = { client: mockClient }

const makeRow = (overrides = {}) => ({
    id: 1,
    degreeName: 'B.Sc. Computer Science',
    instituteName: 'State University',
    instituteUrl: 'https://university.edu',
    startedAt: new Date('2018-09-01T00:00:00.000Z'),
    endedAt: new Date('2022-06-01T00:00:00.000Z'),
    isCompleted: true,
    ...overrides,
})

describe('PrismaEducationReadRepository', () => {
    let repo: PrismaEducationReadRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaEducationReadRepository(mockPrisma as unknown as PrismaService)
    })

    it('orders by startedAt descending with no isPublished filter (all education is always public)', async () => {
        mockClient.education.findMany.mockResolvedValue([makeRow()])

        await repo.findAll()

        const callArgs = (mockClient.education.findMany.mock.calls[0] as unknown[])[0] as Record<string, unknown>
        expect(callArgs.orderBy).toEqual({ startedAt: 'desc' })
        expect(callArgs.where).toBeUndefined()
    })

    it('maps dates to ISO strings', async () => {
        mockClient.education.findMany.mockResolvedValue([makeRow()])

        const result = await repo.findAll()

        expect(result).toEqual([
            {
                id: 1,
                degreeName: 'B.Sc. Computer Science',
                instituteName: 'State University',
                instituteUrl: 'https://university.edu',
                startedAt: '2018-09-01T00:00:00.000Z',
                endedAt: '2022-06-01T00:00:00.000Z',
                isCompleted: true,
            },
        ])
    })

    it('maps a null endedAt to null (currently enrolled) rather than throwing on .toISOString()', async () => {
        mockClient.education.findMany.mockResolvedValue([makeRow({ endedAt: null, isCompleted: false })])

        const result = await repo.findAll()

        expect(result[0].endedAt).toBeNull()
    })

    it('returns an empty array when there are no education records', async () => {
        mockClient.education.findMany.mockResolvedValue([])

        const result = await repo.findAll()

        expect(result).toEqual([])
    })
})
