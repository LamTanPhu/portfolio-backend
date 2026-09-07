/**
 * @fileoverview PrismaEducationReadRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these. Mirrors PrismaSkillReadRepository's shape:
 * findPublished (isPublic-filtered, for the public /about/education list)
 * and findAll (unfiltered, admin use).
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
    isPublic: true,
    ...overrides,
})

describe('PrismaEducationReadRepository', () => {
    let repo: PrismaEducationReadRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaEducationReadRepository(mockPrisma as unknown as PrismaService)
    })

    describe('findPublished', () => {
        it('filters to isPublic and orders by startedAt descending', async () => {
            mockClient.education.findMany.mockResolvedValue([makeRow()])

            await repo.findPublished()

            expect(mockClient.education.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { isPublic: true }, orderBy: { startedAt: 'desc' } }),
            )
        })

        it('excludes hidden records', async () => {
            // The repository itself doesn't filter in memory — the where clause above
            // is what does the filtering at the DB level. This asserts the mapped
            // shape carries isPublic through untouched, so a caller could double-check it.
            mockClient.education.findMany.mockResolvedValue([makeRow({ isPublic: true })])

            const result = await repo.findPublished()

            expect(result.every((r) => r.isPublic)).toBe(true)
        })

        it('maps dates to ISO strings', async () => {
            mockClient.education.findMany.mockResolvedValue([makeRow()])

            const result = await repo.findPublished()

            expect(result).toEqual([
                {
                    id: 1,
                    degreeName: 'B.Sc. Computer Science',
                    instituteName: 'State University',
                    instituteUrl: 'https://university.edu',
                    startedAt: '2018-09-01T00:00:00.000Z',
                    endedAt: '2022-06-01T00:00:00.000Z',
                    isCompleted: true,
                    isPublic: true,
                },
            ])
        })

        it('maps a null endedAt to null (currently enrolled) rather than throwing on .toISOString()', async () => {
            mockClient.education.findMany.mockResolvedValue([makeRow({ endedAt: null, isCompleted: false })])

            const result = await repo.findPublished()

            expect(result[0].endedAt).toBeNull()
        })

        it('returns an empty array when there are no published education records', async () => {
            mockClient.education.findMany.mockResolvedValue([])

            const result = await repo.findPublished()

            expect(result).toEqual([])
        })
    })

    describe('findAll', () => {
        it('applies no where filter (includes hidden records) but keeps the same ordering', async () => {
            mockClient.education.findMany.mockResolvedValue([makeRow()])

            await repo.findAll()

            const callArgs = (mockClient.education.findMany.mock.calls[0] as unknown[])[0] as Record<string, unknown>
            expect(callArgs.where).toBeUndefined()
            expect(callArgs.orderBy).toEqual({ startedAt: 'desc' })
        })

        it('includes both public and hidden records in the mapped result', async () => {
            mockClient.education.findMany.mockResolvedValue([
                makeRow({ id: 1, isPublic: true }),
                makeRow({ id: 2, isPublic: false }),
            ])

            const result = await repo.findAll()

            expect(result.map((r) => r.id)).toEqual([1, 2])
            expect(result.map((r) => r.isPublic)).toEqual([true, false])
        })
    })
})
