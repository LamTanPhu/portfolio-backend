/**
 * @fileoverview UpdateUserProfileCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 *
 * Key behaviors tested:
 * - userId and data are passed through to the repo as separate args
 * - the per-user profile cache is invalidated by userId after update
 * - hashPassword/email can never be touched — UpdateUserInput has no such fields
 */

import { Test, TestingModule } from '@nestjs/testing'
import { UpdateUserProfileCommand } from './UpdateUserProfileCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    update: jest.fn(),
}

const mockCacheService = {
    invalidateUserProfile: jest.fn(),
}

const makeUser = (overrides = {}) => ({
    id: 1,
    firstname: 'Jane',
    lastname: 'Doe',
    email: 'jane@example.com',
    aboutme: 'Backend engineer.',
    lastLogin: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

describe('UpdateUserProfileCommand', () => {
    let command: UpdateUserProfileCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.update.mockResolvedValue(makeUser())
        mockCacheService.invalidateUserProfile.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UpdateUserProfileCommand,
                { provide: 'IUserWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<UpdateUserProfileCommand>(UpdateUserProfileCommand)
    })

    it('calls repo.update with the userId and data as separate arguments', async () => {
        await command.execute(1, { firstname: 'Janet' })

        expect(mockRepo.update).toHaveBeenCalledWith(1, { firstname: 'Janet' })
    })

    it('invalidates the cache for that specific userId', async () => {
        await command.execute(1, { firstname: 'Janet' })

        expect(mockCacheService.invalidateUserProfile).toHaveBeenCalledWith(1)
    })

    it('maps the updated entity to a UserProfileDTO with an ISO lastLogin string', async () => {
        mockRepo.update.mockResolvedValue(makeUser({ firstname: 'Janet' }))

        const result = await command.execute(1, { firstname: 'Janet' })

        expect(result).toEqual({
            id: 1,
            firstname: 'Janet',
            lastname: 'Doe',
            email: 'jane@example.com',
            aboutme: 'Backend engineer.',
            lastLogin: '2026-01-01T00:00:00.000Z',
        })
    })

    it('returns lastLogin: null when the user has never logged in', async () => {
        mockRepo.update.mockResolvedValue(makeUser({ lastLogin: null }))

        const result = await command.execute(1, { aboutme: 'x' })

        expect(result.lastLogin).toBeNull()
    })

    it('propagates an error if the repository throws', async () => {
        mockRepo.update.mockRejectedValue(new Error('not found'))

        await expect(command.execute(999, { firstname: 'x' })).rejects.toThrow('not found')
    })
})
