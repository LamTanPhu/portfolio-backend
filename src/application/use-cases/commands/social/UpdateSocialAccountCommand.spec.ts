/**
 * @fileoverview UpdateSocialAccountCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { UpdateSocialAccountCommand } from './UpdateSocialAccountCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    update: jest.fn(),
}

const mockCacheService = {
    invalidatePublicSocialAccounts: jest.fn(),
}

const makeAccount = (overrides = {}) => ({
    id: 1,
    name: 'GitHub',
    url: 'https://github.com/me',
    imageUrl: 'https://cdn.example.com/github.svg',
    isPublic: true,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

describe('UpdateSocialAccountCommand', () => {
    let command: UpdateSocialAccountCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.update.mockResolvedValue(makeAccount())
        mockCacheService.invalidatePublicSocialAccounts.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UpdateSocialAccountCommand,
                { provide: 'ISocialAccountWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<UpdateSocialAccountCommand>(UpdateSocialAccountCommand)
    })

    it('strips id from the payload before calling the repository', async () => {
        await command.execute({ id: 1, url: 'https://github.com/newhandle' })

        expect(mockRepo.update).toHaveBeenCalledWith(1, { url: 'https://github.com/newhandle' })
    })

    it('supports toggling visibility via a partial update', async () => {
        await command.execute({ id: 1, isPublic: false })

        expect(mockRepo.update).toHaveBeenCalledWith(1, { isPublic: false })
    })

    it('invalidates the public social accounts cache after update', async () => {
        await command.execute({ id: 1, name: 'x' })

        expect(mockCacheService.invalidatePublicSocialAccounts).toHaveBeenCalledTimes(1)
    })

    it('maps the updated entity to a SocialAccountDTO', async () => {
        mockRepo.update.mockResolvedValue(makeAccount({ name: 'X (Twitter)' }))

        const result = await command.execute({ id: 1, name: 'X (Twitter)' })

        expect(result.name).toBe('X (Twitter)')
    })

    it('propagates an error if the repository throws (e.g. account not found)', async () => {
        mockRepo.update.mockRejectedValue(new Error('not found'))

        await expect(command.execute({ id: 999, name: 'x' })).rejects.toThrow('not found')
    })
})
