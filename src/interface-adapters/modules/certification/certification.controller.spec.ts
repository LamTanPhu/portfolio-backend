/**
 * @fileoverview CertificationController Unit Tests
 *
 * Covers ISO-string -> Date conversion (the controller's own job — commands
 * expect real Date objects) and guard wiring.
 *
 * NOTE ON A LIKELY BUG: update() does `dto.endDate ? new Date(dto.endDate) : undefined`.
 * That means sending `endDate: null` on PATCH (the natural way to clear an
 * expiry and make a cert permanent again) is indistinguishable from omitting
 * the field entirely — both resolve to `undefined`, so UpdateCertificationCommand
 * never receives the clear. The test below locks in this *current* behavior
 * so a future fix is a deliberate, visible change here, not a silent one.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { CertificationController } from './certification.controller'
import { GetCertificationsQuery } from '../../../application/use-cases/queries/skill/certificate/GetCertificationsQuery'
import { CreateCertificationCommand } from '../../../application/use-cases/commands/certification/CreateCertificationCommand'
import { UpdateCertificationCommand } from '../../../application/use-cases/commands/certification/UpdateCertificationCommand'
import { DeleteCertificationCommand } from '../../../application/use-cases/commands/certification/DeleteCertificationCommand'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'

const mockGetQuery = { execute: jest.fn() }
const mockCreate = { execute: jest.fn() }
const mockUpdate = { execute: jest.fn() }
const mockDelete = { execute: jest.fn() }

const makeAuthenticatedRequest = (userId = 1) =>
    ({ user: { sub: userId, jti: 'x', iss: 'x', aud: 'x' } }) as AuthenticatedRequest

describe('CertificationController', () => {
    let controller: CertificationController

    beforeEach(async () => {
        jest.clearAllMocks()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [CertificationController],
            providers: [
                { provide: GetCertificationsQuery, useValue: mockGetQuery },
                { provide: CreateCertificationCommand, useValue: mockCreate },
                { provide: UpdateCertificationCommand, useValue: mockUpdate },
                { provide: DeleteCertificationCommand, useValue: mockDelete },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: jest.fn(() => true) })
            .compile()

        controller = module.get<CertificationController>(CertificationController)
    })

    describe('GET /certifications — public', () => {
        it('delegates to GetCertificationsQuery', async () => {
            mockGetQuery.execute.mockResolvedValue([])

            await controller.findAll()

            expect(mockGetQuery.execute).toHaveBeenCalledWith()
        })
    })

    describe('POST /certifications — admin only', () => {
        it('converts startDate/endDate ISO strings to Date objects', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create(
                { name: 'AWS SAA', url: 'https://x.com', startDate: '2025-01-01', endDate: '2028-01-01' },
                makeAuthenticatedRequest(),
            )

            expect(mockCreate.execute).toHaveBeenCalledWith(
                expect.objectContaining({ startDate: new Date('2025-01-01'), endDate: new Date('2028-01-01') }),
            )
        })

        it('sets endDate to null (lifetime cert) when omitted', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create(
                { name: 'AWS SAA', url: 'https://x.com', startDate: '2025-01-01' },
                makeAuthenticatedRequest(),
            )

            expect(mockCreate.execute).toHaveBeenCalledWith(expect.objectContaining({ endDate: null }))
        })

        it('defaults isPublished to false and takes userId from the JWT payload', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create(
                { name: 'AWS SAA', url: 'https://x.com', startDate: '2025-01-01' },
                makeAuthenticatedRequest(7),
            )

            expect(mockCreate.execute).toHaveBeenCalledWith(expect.objectContaining({ isPublished: false, userId: 7 }))
        })
    })

    describe('PATCH /certifications/:id — admin only', () => {
        it('merges id and converts provided date fields', async () => {
            mockUpdate.execute.mockResolvedValue({ id: 1 })

            await controller.update(1, { name: 'Updated', startDate: '2025-06-01', endDate: '2029-06-01' })

            expect(mockUpdate.execute).toHaveBeenCalledWith({
                id: 1,
                name: 'Updated',
                url: undefined,
                startDate: new Date('2025-06-01'),
                endDate: new Date('2029-06-01'),
                isPublished: undefined,
            })
        })

        it('leaves startDate/endDate as undefined (no change) when omitted from the payload', async () => {
            mockUpdate.execute.mockResolvedValue({ id: 1 })

            await controller.update(1, { name: 'Updated' })

            expect(mockUpdate.execute).toHaveBeenCalledWith(
                expect.objectContaining({ startDate: undefined, endDate: undefined }),
            )
        })

        it('KNOWN BUG: sending endDate: null to clear an expiry resolves to undefined, not null — the clear is silently dropped', async () => {
            mockUpdate.execute.mockResolvedValue({ id: 1 })

            await controller.update(1, { endDate: null })

            expect(mockUpdate.execute).toHaveBeenCalledWith(expect.objectContaining({ endDate: undefined }))
        })
    })

    describe('DELETE /certifications/:id — admin only', () => {
        it('forwards the parsed id to DeleteCertificationCommand', async () => {
            await controller.delete(5)

            expect(mockDelete.execute).toHaveBeenCalledWith(5)
        })
    })
})
