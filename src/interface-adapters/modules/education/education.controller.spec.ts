/**
 * @fileoverview EducationController Unit Tests
 *
 * NOTE ON A LIKELY BUG: update() does `dto.endedAt ? new Date(dto.endedAt) : undefined`,
 * same pattern as CertificationController. Sending `endedAt: null` on PATCH
 * (e.g. re-opening a degree marked complete by mistake) is indistinguishable
 * from omitting the field — see the test below that locks in this behavior.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { EducationController } from './education.controller'
import { GetEducationQuery } from '../../../application/use-cases/queries/skill/education/GetEducationQuery'
import { CreateEducationCommand } from '../../../application/use-cases/commands/education/CreateEducationCommand'
import { UpdateEducationCommand } from '../../../application/use-cases/commands/education/UpdateEducationCommand'
import { DeleteEducationCommand } from '../../../application/use-cases/commands/education/DeleteEducationCommand'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'

const mockGetQuery = { execute: jest.fn() }
const mockCreate = { execute: jest.fn() }
const mockUpdate = { execute: jest.fn() }
const mockDelete = { execute: jest.fn() }

const makeAuthenticatedRequest = (userId = 1) =>
    ({ user: { sub: userId, jti: 'x', iss: 'x', aud: 'x' } }) as AuthenticatedRequest

describe('EducationController', () => {
    let controller: EducationController

    beforeEach(async () => {
        jest.clearAllMocks()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [EducationController],
            providers: [
                { provide: GetEducationQuery, useValue: mockGetQuery },
                { provide: CreateEducationCommand, useValue: mockCreate },
                { provide: UpdateEducationCommand, useValue: mockUpdate },
                { provide: DeleteEducationCommand, useValue: mockDelete },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: jest.fn(() => true) })
            .compile()

        controller = module.get<EducationController>(EducationController)
    })

    describe('GET /education — public', () => {
        it('delegates to GetEducationQuery', async () => {
            mockGetQuery.execute.mockResolvedValue([])

            await controller.findAll()

            expect(mockGetQuery.execute).toHaveBeenCalledWith()
        })
    })

    describe('POST /education — admin only', () => {
        it('converts startedAt/endedAt ISO strings to Date objects', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create(
                {
                    degreeName: 'B.Sc.',
                    instituteName: 'State University',
                    startedAt: '2018-09-01',
                    endedAt: '2022-06-01',
                },
                makeAuthenticatedRequest(),
            )

            expect(mockCreate.execute).toHaveBeenCalledWith(
                expect.objectContaining({ startedAt: new Date('2018-09-01'), endedAt: new Date('2022-06-01') }),
            )
        })

        it('defaults instituteUrl to null and endedAt to null (ongoing) when omitted', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create(
                { degreeName: 'B.Sc.', instituteName: 'State University', startedAt: '2018-09-01' },
                makeAuthenticatedRequest(),
            )

            expect(mockCreate.execute).toHaveBeenCalledWith(
                expect.objectContaining({ instituteUrl: null, endedAt: null }),
            )
        })

        it('defaults isCompleted to false and takes userId from the JWT payload', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create(
                { degreeName: 'B.Sc.', instituteName: 'State University', startedAt: '2018-09-01' },
                makeAuthenticatedRequest(9),
            )

            expect(mockCreate.execute).toHaveBeenCalledWith(expect.objectContaining({ isCompleted: false, userId: 9 }))
        })
    })

    describe('PATCH /education/:id — admin only', () => {
        it('merges id and converts provided date fields', async () => {
            mockUpdate.execute.mockResolvedValue({ id: 1 })

            await controller.update(1, { degreeName: 'M.Sc.', startedAt: '2023-09-01', endedAt: '2025-06-01' })

            expect(mockUpdate.execute).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 1,
                    degreeName: 'M.Sc.',
                    startedAt: new Date('2023-09-01'),
                    endedAt: new Date('2025-06-01'),
                }),
            )
        })

        it('KNOWN BUG: sending endedAt: null to reopen a degree resolves to undefined, not null — the clear is silently dropped', async () => {
            mockUpdate.execute.mockResolvedValue({ id: 1 })

            await controller.update(1, { endedAt: null })

            expect(mockUpdate.execute).toHaveBeenCalledWith(expect.objectContaining({ endedAt: undefined }))
        })
    })

    describe('DELETE /education/:id — admin only', () => {
        it('forwards the parsed id to DeleteEducationCommand', async () => {
            await controller.delete(5)

            expect(mockDelete.execute).toHaveBeenCalledWith(5)
        })
    })
})
