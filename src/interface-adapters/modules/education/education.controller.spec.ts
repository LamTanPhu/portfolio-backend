/**
 * @fileoverview EducationController Unit Tests
 *
 * update() distinguishes three states for endedAt: omitted (undefined ->
 * leave unchanged), explicit null (-> reopen the degree, currently
 * enrolled), and a date string (-> set it). Same three-state handling as
 * CertificationController.
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

        it('reopens a degree (currently enrolled) when endedAt is explicitly sent as null', async () => {
            mockUpdate.execute.mockResolvedValue({ id: 1 })

            await controller.update(1, { endedAt: null })

            expect(mockUpdate.execute).toHaveBeenCalledWith(expect.objectContaining({ endedAt: null }))
        })
    })

    describe('DELETE /education/:id — admin only', () => {
        it('forwards the parsed id to DeleteEducationCommand', async () => {
            await controller.delete(5)

            expect(mockDelete.execute).toHaveBeenCalledWith(5)
        })
    })
})
