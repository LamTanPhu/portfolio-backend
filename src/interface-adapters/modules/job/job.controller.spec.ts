/**
 * @fileoverview JobController Unit Tests
 *
 * update() distinguishes three states for endedAt: omitted (undefined ->
 * leave unchanged), explicit null (-> un-end the job, still employed
 * again), and a date string (-> set it). Same three-state handling as
 * CertificationController/EducationController.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { JobController } from './job.controller'
import { GetJobsQuery } from '../../../application/use-cases/queries/skill/jobs/GetJobsQuery'
import { CreateJobCommand } from '../../../application/use-cases/commands/job/CreateJobCommand'
import { UpdateJobCommand } from '../../../application/use-cases/commands/job/UpdateJobCommand'
import { DeleteJobCommand } from '../../../application/use-cases/commands/job/DeleteJobCommand'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'

const mockGetQuery = { execute: jest.fn() }
const mockCreate = { execute: jest.fn() }
const mockUpdate = { execute: jest.fn() }
const mockDelete = { execute: jest.fn() }

const makeAuthenticatedRequest = (userId = 1) =>
    ({ user: { sub: userId, jti: 'x', iss: 'x', aud: 'x' } }) as AuthenticatedRequest

describe('JobController', () => {
    let controller: JobController

    beforeEach(async () => {
        jest.clearAllMocks()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [JobController],
            providers: [
                { provide: GetJobsQuery, useValue: mockGetQuery },
                { provide: CreateJobCommand, useValue: mockCreate },
                { provide: UpdateJobCommand, useValue: mockUpdate },
                { provide: DeleteJobCommand, useValue: mockDelete },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: jest.fn(() => true) })
            .compile()

        controller = module.get<JobController>(JobController)
    })

    describe('GET /jobs — public', () => {
        it('delegates to GetJobsQuery', async () => {
            mockGetQuery.execute.mockResolvedValue([])

            await controller.findAll()

            expect(mockGetQuery.execute).toHaveBeenCalledWith()
        })
    })

    describe('POST /jobs — admin only', () => {
        it('converts startedAt/endedAt ISO strings to Date objects', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create(
                { companyName: 'Acme', role: 'Engineer', startedAt: '2022-01-01', endedAt: '2023-12-31' },
                makeAuthenticatedRequest(),
            )

            expect(mockCreate.execute).toHaveBeenCalledWith(
                expect.objectContaining({ startedAt: new Date('2022-01-01'), endedAt: new Date('2023-12-31') }),
            )
        })

        it('defaults endedAt to null (still employed) and isEnded to false when omitted', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create(
                { companyName: 'Acme', role: 'Engineer', startedAt: '2022-01-01' },
                makeAuthenticatedRequest(),
            )

            expect(mockCreate.execute).toHaveBeenCalledWith(expect.objectContaining({ endedAt: null, isEnded: false }))
        })

        it('takes userId from the JWT payload, never from the request body', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create(
                { companyName: 'Acme', role: 'Engineer', startedAt: '2022-01-01' },
                makeAuthenticatedRequest(11),
            )

            expect(mockCreate.execute).toHaveBeenCalledWith(expect.objectContaining({ userId: 11 }))
        })
    })

    describe('PATCH /jobs/:id — admin only', () => {
        it('merges id and converts provided date fields', async () => {
            mockUpdate.execute.mockResolvedValue({ id: 1 })

            await controller.update(1, { role: 'Senior Engineer', endedAt: '2024-06-01', isEnded: true })

            expect(mockUpdate.execute).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 1,
                    role: 'Senior Engineer',
                    endedAt: new Date('2024-06-01'),
                    isEnded: true,
                }),
            )
        })

        it('un-ends a job (still employed again) when endedAt is explicitly sent as null', async () => {
            mockUpdate.execute.mockResolvedValue({ id: 1 })

            await controller.update(1, { endedAt: null })

            expect(mockUpdate.execute).toHaveBeenCalledWith(expect.objectContaining({ endedAt: null }))
        })
    })

    describe('DELETE /jobs/:id — admin only', () => {
        it('forwards the parsed id to DeleteJobCommand', async () => {
            await controller.delete(5)

            expect(mockDelete.execute).toHaveBeenCalledWith(5)
        })
    })
})
