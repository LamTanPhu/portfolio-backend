/**
 * @fileoverview DeleteCertificationCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { DeleteCertificationCommand } from './DeleteCertificationCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    delete: jest.fn(),
}

const mockCacheService = {
    invalidatePublicCertifications: jest.fn(),
}

describe('DeleteCertificationCommand', () => {
    let command: DeleteCertificationCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.delete.mockResolvedValue(undefined)
        mockCacheService.invalidatePublicCertifications.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeleteCertificationCommand,
                { provide: 'ICertificationWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<DeleteCertificationCommand>(DeleteCertificationCommand)
    })

    it('deletes the certification by id', async () => {
        await command.execute(5)

        expect(mockRepo.delete).toHaveBeenCalledWith(5)
    })

    it('invalidates the public certifications cache after delete', async () => {
        await command.execute(5)

        expect(mockCacheService.invalidatePublicCertifications).toHaveBeenCalledTimes(1)
    })

    it('resolves without a return value', async () => {
        await expect(command.execute(5)).resolves.toBeUndefined()
    })

    it('propagates an error and skips cache invalidation if delete fails', async () => {
        mockRepo.delete.mockRejectedValue(new Error('not found'))

        await expect(command.execute(999)).rejects.toThrow('not found')
        expect(mockCacheService.invalidatePublicCertifications).not.toHaveBeenCalled()
    })
})
