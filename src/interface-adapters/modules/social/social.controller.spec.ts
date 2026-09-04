/**
 * @fileoverview SocialController Unit Tests
 */

import { GUARDS_METADATA } from '@nestjs/common/constants'
import { Test, TestingModule } from '@nestjs/testing'
import { SocialController } from './social.controller'
import { GetPublicSocialAccountsQuery } from '../../../application/use-cases/queries/social/GetPublicSocialAccountsQuery'
import { CreateSocialAccountCommand } from '../../../application/use-cases/commands/social/CreateSocialAccountCommand'
import { UpdateSocialAccountCommand } from '../../../application/use-cases/commands/social/UpdateSocialAccountCommand'
import { DeleteSocialAccountCommand } from '../../../application/use-cases/commands/social/DeleteSocialAccountCommand'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'

const mockGetPublic = { execute: jest.fn() }
const mockCreate = { execute: jest.fn() }
const mockUpdate = { execute: jest.fn() }
const mockDelete = { execute: jest.fn() }

const makeAuthenticatedRequest = (userId = 1) =>
    ({ user: { sub: userId, jti: 'x', iss: 'x', aud: 'x' } }) as AuthenticatedRequest

describe('SocialController', () => {
    let controller: SocialController

    beforeEach(async () => {
        jest.clearAllMocks()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [SocialController],
            providers: [
                { provide: GetPublicSocialAccountsQuery, useValue: mockGetPublic },
                { provide: CreateSocialAccountCommand, useValue: mockCreate },
                { provide: UpdateSocialAccountCommand, useValue: mockUpdate },
                { provide: DeleteSocialAccountCommand, useValue: mockDelete },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: jest.fn(() => true) })
            .compile()

        controller = module.get<SocialController>(SocialController)
    })

    describe('GET /social — public', () => {
        it('delegates to GetPublicSocialAccountsQuery', async () => {
            mockGetPublic.execute.mockResolvedValue([])

            await controller.findAll()

            expect(mockGetPublic.execute).toHaveBeenCalledWith()
        })
    })

    describe('POST /social — admin only', () => {
        it('is protected by JwtAuthGuard', () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method -- reading Nest's route-guard metadata off the unbound method reference is intentional
            const guards = Reflect.getMetadata(GUARDS_METADATA, SocialController.prototype.create) as
                | unknown[]
                | undefined

            expect(guards).toContain(JwtAuthGuard)
        })

        it('defaults imageUrl to null and isPublic to true when omitted', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create({ name: 'GitHub', url: 'https://github.com/me' }, makeAuthenticatedRequest())

            expect(mockCreate.execute).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: null, isPublic: true }))
        })

        it('takes userId from the JWT payload', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create({ name: 'GitHub', url: 'https://github.com/me' }, makeAuthenticatedRequest(3))

            expect(mockCreate.execute).toHaveBeenCalledWith(expect.objectContaining({ userId: 3 }))
        })
    })

    describe('PATCH /social/:id — admin only', () => {
        it('merges the parsed id with the update payload, passing fields through unchanged', async () => {
            mockUpdate.execute.mockResolvedValue({ id: 1 })

            await controller.update(1, { url: 'https://github.com/newhandle' })

            expect(mockUpdate.execute).toHaveBeenCalledWith(
                expect.objectContaining({ id: 1, url: 'https://github.com/newhandle' }),
            )
        })

        it('correctly passes an explicit null through to clear imageUrl', async () => {
            mockUpdate.execute.mockResolvedValue({ id: 1 })

            await controller.update(1, { imageUrl: null })

            expect(mockUpdate.execute).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: null }))
        })
    })

    describe('DELETE /social/:id — admin only', () => {
        it('forwards the parsed id to DeleteSocialAccountCommand', async () => {
            await controller.delete(5)

            expect(mockDelete.execute).toHaveBeenCalledWith(5)
        })
    })
})
