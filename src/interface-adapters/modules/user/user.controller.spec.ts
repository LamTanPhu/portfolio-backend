/**
 * @fileoverview UserController Unit Tests
 *
 * Guard is applied at the class level (@UseGuards(JwtAuthGuard) on the
 * controller itself), unlike every other admin controller in this app
 * where it's per-method — verified via class-level metadata reflection.
 */

import { GUARDS_METADATA } from '@nestjs/common/constants'
import { Test, TestingModule } from '@nestjs/testing'
import { UserController } from './user.controller'
import { GetUserProfileQuery } from '../../../application/use-cases/queries/user/GetUserProfileQuery'
import { UpdateUserProfileCommand } from '../../../application/use-cases/commands/user/UpdateUserProfileCommand'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'

const mockGetProfile = { execute: jest.fn() }
const mockUpdateProfile = { execute: jest.fn() }

const makeAuthenticatedRequest = (userId = 1) =>
    ({ user: { sub: userId, jti: 'x', iss: 'x', aud: 'x' } }) as AuthenticatedRequest

describe('UserController', () => {
    let controller: UserController

    beforeEach(async () => {
        jest.clearAllMocks()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                { provide: GetUserProfileQuery, useValue: mockGetProfile },
                { provide: UpdateUserProfileCommand, useValue: mockUpdateProfile },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: jest.fn(() => true) })
            .compile()

        controller = module.get<UserController>(UserController)
    })

    it('applies JwtAuthGuard at the controller (class) level — every route is protected', () => {
        const guards = Reflect.getMetadata(GUARDS_METADATA, UserController) as unknown[] | undefined

        expect(guards).toContain(JwtAuthGuard)
    })

    describe('GET /user/profile', () => {
        it("fetches the profile for the authenticated user's id, not any id from the request body", async () => {
            const profile = { id: 1, firstname: 'Jane' }
            mockGetProfile.execute.mockResolvedValue(profile)

            const result = await controller.profile(makeAuthenticatedRequest(1))

            expect(mockGetProfile.execute).toHaveBeenCalledWith(1)
            expect(result).toBe(profile)
        })
    })

    describe('PATCH /user/profile', () => {
        it('updates only firstname/lastname/aboutme — email and password are never touched', async () => {
            mockUpdateProfile.execute.mockResolvedValue({ id: 1 })

            await controller.update(
                { firstname: 'Janet', lastname: 'Doe', aboutme: 'New bio' },
                makeAuthenticatedRequest(1),
            )

            expect(mockUpdateProfile.execute).toHaveBeenCalledWith(1, {
                firstname: 'Janet',
                lastname: 'Doe',
                aboutme: 'New bio',
            })
        })

        it("updates the authenticated user's own id, not an id supplied by the client", async () => {
            mockUpdateProfile.execute.mockResolvedValue({ id: 5 })

            await controller.update({ firstname: 'Janet' }, makeAuthenticatedRequest(5))

            expect(mockUpdateProfile.execute).toHaveBeenCalledWith(5, expect.anything())
        })

        it('returns the updated profile', async () => {
            const updated = { id: 1, firstname: 'Janet' }
            mockUpdateProfile.execute.mockResolvedValue(updated)

            const result = await controller.update({ firstname: 'Janet' }, makeAuthenticatedRequest(1))

            expect(result).toBe(updated)
        })
    })
})
