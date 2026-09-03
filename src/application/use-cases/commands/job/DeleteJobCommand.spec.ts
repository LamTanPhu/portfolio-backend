/**
 * @fileoverview DeleteJobCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { DeleteJobCommand } from './DeleteJobCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    delete: jest.fn(),
}

const mockCacheService = {
    invalidatePublicJobs: jest.fn(),
}

describe('DeleteJobCommand', () => {
    let command: DeleteJobCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.delete.mockResolvedValue(undefined)
        mockCacheService.invalidatePublicJobs.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeleteJobCommand,
                { provide: 'IJobWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<DeleteJobCommand>(DeleteJobCommand)
    })

    it('deletes the job record by id', async () => {
        await command.execute(5)

        expect(mockRepo.delete).toHaveBeenCalledWith(5)
    })

    it('invalidates the public jobs cache after delete', async () => {
        await command.execute(5)

        expect(mockCacheService.invalidatePublicJobs).toHaveBeenCalledTimes(1)
    })

    it('propagates an error and skips cache invalidation if delete fails', async () => {
        mockRepo.delete.mockRejectedValue(new Error('not found'))

        await expect(command.execute(999)).rejects.toThrow('not found')
        expect(mockCacheService.invalidatePublicJobs).not.toHaveBeenCalled()
    })
})
