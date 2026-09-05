/**
 * @fileoverview PrismaEducationWriteRepository Unit Tests
 *
 * PrismaService is fully mocked — no real database, no generated Prisma
 * Client needed to run these. `Prisma.PrismaClientKnownRequestError` is
 * constructed for real so the repository's own `instanceof` checks
 * exercise the same branch they would against a genuine Prisma error.
 */

import { Prisma } from '@prisma/client'
import { PrismaEducationWriteRepository } from './PrismaEducationWriteRepository'
import { Education } from '../../../../domain/entities/Education'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { PrismaService } from '../../prisma/prisma.service'

const mockClient = {
    education: {
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
    degreeName: 'B.Sc. Computer Science',
    instituteName: 'State University',
    instituteUrl: 'https://university.edu',
    startedAt: new Date('2018-09-01T00:00:00.000Z'),
    endedAt: new Date('2022-06-01T00:00:00.000Z'),
    isCompleted: true,
    userId: 1,
    createdAt: new Date('2018-09-01T00:00:00.000Z'),
    updatedAt: new Date('2018-09-01T00:00:00.000Z'),
    ...overrides,
})

describe('PrismaEducationWriteRepository', () => {
    let repo: PrismaEducationWriteRepository

    beforeEach(() => {
        jest.clearAllMocks()
        repo = new PrismaEducationWriteRepository(mockPrisma as unknown as PrismaService)
    })

    describe('create', () => {
        it('passes the input straight through as Prisma create data', async () => {
            const input = {
                degreeName: 'B.Sc. Computer Science',
                instituteName: 'State University',
                instituteUrl: 'https://university.edu',
                startedAt: new Date('2018-09-01'),
                endedAt: new Date('2022-06-01'),
                isCompleted: true,
                userId: 1,
            }
            mockClient.education.create.mockResolvedValue(makeRow())

            await repo.create(input)

            expect(mockClient.education.create).toHaveBeenCalledWith({ data: input })
        })

        it('maps the created row to an Education entity', async () => {
            const row = makeRow()
            mockClient.education.create.mockResolvedValue(row)

            const result = await repo.create({
                degreeName: row.degreeName,
                instituteName: row.instituteName,
                instituteUrl: row.instituteUrl,
                startedAt: row.startedAt,
                endedAt: row.endedAt,
                isCompleted: row.isCompleted,
                userId: row.userId,
            })

            expect(result).toEqual(
                new Education(
                    1,
                    row.degreeName,
                    row.instituteName,
                    row.instituteUrl,
                    row.startedAt,
                    row.endedAt,
                    true,
                    1,
                    row.createdAt,
                    row.updatedAt,
                ),
            )
        })
    })

    describe('update', () => {
        it('updates by id with the given data', async () => {
            mockClient.education.update.mockResolvedValue(makeRow({ degreeName: 'M.Sc.' }))

            await repo.update(1, { degreeName: 'M.Sc.' })

            expect(mockClient.education.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { degreeName: 'M.Sc.' },
            })
        })

        it('maps the updated row to an Education entity', async () => {
            mockClient.education.update.mockResolvedValue(makeRow({ degreeName: 'M.Sc.' }))

            const result = await repo.update(1, { degreeName: 'M.Sc.' })

            expect(result.degreeName).toBe('M.Sc.')
            expect(result).toBeInstanceOf(Education)
        })

        it('translates a P2025 record-not-found error into NotFoundError naming the id', async () => {
            mockClient.education.update.mockRejectedValue(makeKnownError('P2025'))

            await expect(repo.update(999, { degreeName: 'x' })).rejects.toThrow(
                new NotFoundError('Education not found: 999'),
            )
        })

        it('re-throws any other Prisma error code unchanged', async () => {
            const error = makeKnownError('P2002')
            mockClient.education.update.mockRejectedValue(error)

            await expect(repo.update(1, { degreeName: 'x' })).rejects.toBe(error)
        })
    })

    describe('delete', () => {
        it('deletes by id', async () => {
            mockClient.education.delete.mockResolvedValue(makeRow())

            await repo.delete(1)

            expect(mockClient.education.delete).toHaveBeenCalledWith({ where: { id: 1 } })
        })

        it('translates a P2025 record-not-found error into NotFoundError naming the id', async () => {
            mockClient.education.delete.mockRejectedValue(makeKnownError('P2025'))

            await expect(repo.delete(999)).rejects.toThrow(new NotFoundError('Education not found: 999'))
        })

        it('re-throws a non-Prisma error unchanged', async () => {
            const error = new Error('connection reset')
            mockClient.education.delete.mockRejectedValue(error)

            await expect(repo.delete(1)).rejects.toBe(error)
        })
    })
})
