/**
 * @fileoverview DeleteSocialAccountCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { DeleteSocialAccountCommand } from './DeleteSocialAccountCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    delete: jest.fn(),
}

const mockCacheService = {
    invalidatePublicSocialAccounts: jest.fn(),
}

describe('DeleteSocialAccountCommand', () => {
    let command: DeleteSocialAccountCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.delete.mockResolvedValue(undefined)
        mockCacheService.invalidatePublicSocialAccounts.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeleteSocialAccountCommand,
                { provide: 'ISocialAccountWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<DeleteSocialAccountCommand>(DeleteSocialAccountCommand)
    })

    it('deletes the social account by id', async () => {
        await command.execute(5)

        expect(mockRepo.delete).toHaveBeenCalledWith(5)
    })

    it('invalidates the public social accounts cache after delete', async () => {
        await command.execute(5)

        expect(mockCacheService.invalidatePublicSocialAccounts).toHaveBeenCalledTimes(1)
    })

    it('propagates an error and skips cache invalidation if delete fails', async () => {
        mockRepo.delete.mockRejectedValue(new Error('not found'))

        await expect(command.execute(999)).rejects.toThrow('not found')
        expect(mockCacheService.invalidatePublicSocialAccounts).not.toHaveBeenCalled()
    })
})
