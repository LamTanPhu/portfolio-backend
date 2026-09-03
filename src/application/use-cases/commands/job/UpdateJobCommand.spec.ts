/**
 * @fileoverview UpdateJobCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { UpdateJobCommand } from './UpdateJobCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    update: jest.fn(),
}

const mockCacheService = {
    invalidatePublicJobs: jest.fn(),
}

const makeJob = (overrides = {}) => ({
    id: 1,
    companyName: 'Acme Corp',
    role: 'Senior Backend Engineer',
    startedAt: new Date('2022-01-01'),
    endedAt: null,
    isEnded: false,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

describe('UpdateJobCommand', () => {
    let command: UpdateJobCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.update.mockResolvedValue(makeJob())
        mockCacheService.invalidatePublicJobs.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UpdateJobCommand,
                { provide: 'IJobWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<UpdateJobCommand>(UpdateJobCommand)
    })

    it('strips id from the payload before calling the repository', async () => {
        await command.execute({ id: 1, role: 'Staff Engineer' })

        expect(mockRepo.update).toHaveBeenCalledWith(1, { role: 'Staff Engineer' })
    })

    it('supports marking a job as ended via a partial update', async () => {
        const endedAt = new Date('2024-06-01')

        await command.execute({ id: 1, isEnded: true, endedAt })

        expect(mockRepo.update).toHaveBeenCalledWith(1, { isEnded: true, endedAt })
    })

    it('invalidates the public jobs cache after update', async () => {
        await command.execute({ id: 1, role: 'x' })

        expect(mockCacheService.invalidatePublicJobs).toHaveBeenCalledTimes(1)
    })

    it('maps the updated entity to a JobDTO', async () => {
        mockRepo.update.mockResolvedValue(makeJob({ id: 1, role: 'Staff Engineer' }))

        const result = await command.execute({ id: 1, role: 'Staff Engineer' })

        expect(result.role).toBe('Staff Engineer')
    })

    it('propagates an error if the repository throws (e.g. record not found)', async () => {
        mockRepo.update.mockRejectedValue(new Error('not found'))

        await expect(command.execute({ id: 999, role: 'x' })).rejects.toThrow('not found')
    })
})
