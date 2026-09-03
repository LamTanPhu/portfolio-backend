/**
 * @fileoverview DeleteSkillCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { DeleteSkillCommand } from './DeleteSkillCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    delete: jest.fn(),
}

const mockCacheService = {
    invalidatePublicSkills: jest.fn(),
}

describe('DeleteSkillCommand', () => {
    let command: DeleteSkillCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.delete.mockResolvedValue(undefined)
        mockCacheService.invalidatePublicSkills.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeleteSkillCommand,
                { provide: 'ISkillWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<DeleteSkillCommand>(DeleteSkillCommand)
    })

    it('deletes the skill by id', async () => {
        await command.execute(5)

        expect(mockRepo.delete).toHaveBeenCalledWith(5)
    })

    it('invalidates the public skills cache after delete', async () => {
        await command.execute(5)

        expect(mockCacheService.invalidatePublicSkills).toHaveBeenCalledTimes(1)
    })

    it('propagates an error and skips cache invalidation if delete fails', async () => {
        mockRepo.delete.mockRejectedValue(new Error('not found'))

        await expect(command.execute(999)).rejects.toThrow('not found')
        expect(mockCacheService.invalidatePublicSkills).not.toHaveBeenCalled()
    })
})
