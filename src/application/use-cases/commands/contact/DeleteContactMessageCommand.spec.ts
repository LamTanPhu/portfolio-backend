/**
 * @fileoverview DeleteContactMessageCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 *
 * Key behaviors tested:
 * - Throws NotFoundError when repo.delete reports nothing was deleted
 * - Invalidates the admin contact list cache only on a successful delete
 */

import { Test, TestingModule } from '@nestjs/testing'
import { DeleteContactMessageCommand } from './DeleteContactMessageCommand'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    delete: jest.fn(),
}

const mockCacheService = {
    invalidateContactList: jest.fn(),
}

describe('DeleteContactMessageCommand', () => {
    let command: DeleteContactMessageCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.delete.mockResolvedValue(true)
        mockCacheService.invalidateContactList.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeleteContactMessageCommand,
                { provide: 'IContactWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<DeleteContactMessageCommand>(DeleteContactMessageCommand)
    })

    describe('execute() — happy path', () => {
        it('deletes the message by id', async () => {
            await command.execute(1)

            expect(mockRepo.delete).toHaveBeenCalledWith(1)
        })

        it('invalidates the admin contact list cache after a successful delete', async () => {
            await command.execute(1)

            expect(mockCacheService.invalidateContactList).toHaveBeenCalledTimes(1)
        })
    })

    describe('execute() — not found', () => {
        it('throws NotFoundError when the repo reports nothing was deleted', async () => {
            mockRepo.delete.mockResolvedValue(false)

            await expect(command.execute(999)).rejects.toThrow(NotFoundError)
        })

        it('does not invalidate the cache when nothing was deleted', async () => {
            mockRepo.delete.mockResolvedValue(false)

            await expect(command.execute(999)).rejects.toThrow()
            expect(mockCacheService.invalidateContactList).not.toHaveBeenCalled()
        })
    })
})
