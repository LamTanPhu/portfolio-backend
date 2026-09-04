/**
 * @fileoverview SkillController Unit Tests
 */

import { GUARDS_METADATA } from '@nestjs/common/constants'
import { Test, TestingModule } from '@nestjs/testing'
import { SkillController } from './skill.controller'
import { GetPublishedSkillsQuery } from '../../../application/use-cases/queries/skill/GetPublishedSkillsQuery'
import { CreateSkillCommand } from '../../../application/use-cases/commands/skill/CreateSkillCommand'
import { UpdateSkillCommand } from '../../../application/use-cases/commands/skill/UpdateSkillCommand'
import { DeleteSkillCommand } from '../../../application/use-cases/commands/skill/DeleteSkillCommand'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'
import { SkillCategoryEnum } from './skill.dto'

const mockGetPublished = { execute: jest.fn() }
const mockCreate = { execute: jest.fn() }
const mockUpdate = { execute: jest.fn() }
const mockDelete = { execute: jest.fn() }

const makeAuthenticatedRequest = (userId = 1) =>
    ({ user: { sub: userId, jti: 'x', iss: 'x', aud: 'x' } }) as AuthenticatedRequest

describe('SkillController', () => {
    let controller: SkillController

    beforeEach(async () => {
        jest.clearAllMocks()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [SkillController],
            providers: [
                { provide: GetPublishedSkillsQuery, useValue: mockGetPublished },
                { provide: CreateSkillCommand, useValue: mockCreate },
                { provide: UpdateSkillCommand, useValue: mockUpdate },
                { provide: DeleteSkillCommand, useValue: mockDelete },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: jest.fn(() => true) })
            .compile()

        controller = module.get<SkillController>(SkillController)
    })

    describe('GET /skills — public', () => {
        it('delegates to GetPublishedSkillsQuery', async () => {
            mockGetPublished.execute.mockResolvedValue([])

            await controller.findAll()

            expect(mockGetPublished.execute).toHaveBeenCalledWith()
        })
    })

    describe('POST /skills — admin only', () => {
        it('is protected by JwtAuthGuard', () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method -- reading Nest's route-guard metadata off the unbound method reference is intentional
            const guards = Reflect.getMetadata(GUARDS_METADATA, SkillController.prototype.create) as
                | unknown[]
                | undefined

            expect(guards).toContain(JwtAuthGuard)
        })

        it('defaults imageUrl to null and isPublic to true when omitted', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create({ name: 'TS', category: SkillCategoryEnum.backend }, makeAuthenticatedRequest())

            expect(mockCreate.execute).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: null, isPublic: true }))
        })

        it('takes userId from the JWT payload', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create({ name: 'TS', category: SkillCategoryEnum.backend }, makeAuthenticatedRequest(15))

            expect(mockCreate.execute).toHaveBeenCalledWith(expect.objectContaining({ userId: 15 }))
        })
    })

    describe('PATCH /skills/:id — admin only', () => {
        it('merges the parsed id with the update payload, passing fields through unchanged', async () => {
            mockUpdate.execute.mockResolvedValue({ id: 1 })

            await controller.update(1, { name: 'Rust', isPublic: false })

            expect(mockUpdate.execute).toHaveBeenCalledWith(
                expect.objectContaining({ id: 1, name: 'Rust', isPublic: false }),
            )
        })

        it('correctly passes an explicit null through to clear imageUrl', async () => {
            mockUpdate.execute.mockResolvedValue({ id: 1 })

            await controller.update(1, { imageUrl: null })

            expect(mockUpdate.execute).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: null }))
        })
    })

    describe('DELETE /skills/:id — admin only', () => {
        it('forwards the parsed id to DeleteSkillCommand', async () => {
            await controller.delete(5)

            expect(mockDelete.execute).toHaveBeenCalledWith(5)
        })
    })
})
