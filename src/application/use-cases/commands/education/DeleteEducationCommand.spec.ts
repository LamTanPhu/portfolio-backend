/**
 * @fileoverview DeleteEducationCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { DeleteEducationCommand } from './DeleteEducationCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    delete: jest.fn(),
}

const mockCacheService = {
    invalidatePublicEducation: jest.fn(),
}

describe('DeleteEducationCommand', () => {
    let command: DeleteEducationCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.delete.mockResolvedValue(undefined)
        mockCacheService.invalidatePublicEducation.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeleteEducationCommand,
                { provide: 'IEducationWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<DeleteEducationCommand>(DeleteEducationCommand)
    })

    it('deletes the education record by id', async () => {
        await command.execute(5)

        expect(mockRepo.delete).toHaveBeenCalledWith(5)
    })

    it('invalidates the public education cache after delete', async () => {
        await command.execute(5)

        expect(mockCacheService.invalidatePublicEducation).toHaveBeenCalledTimes(1)
    })

    it('propagates an error and skips cache invalidation if delete fails', async () => {
        mockRepo.delete.mockRejectedValue(new Error('not found'))

        await expect(command.execute(999)).rejects.toThrow('not found')
        expect(mockCacheService.invalidatePublicEducation).not.toHaveBeenCalled()
    })
})
