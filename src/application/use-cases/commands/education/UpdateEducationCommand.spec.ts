/**
 * @fileoverview UpdateEducationCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { UpdateEducationCommand } from './UpdateEducationCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    update: jest.fn(),
}

const mockCacheService = {
    invalidatePublicEducation: jest.fn(),
}

const makeEducation = (overrides = {}) => ({
    id: 1,
    degreeName: 'B.Sc. Computer Science',
    instituteName: 'State University',
    instituteUrl: 'https://university.edu',
    startedAt: new Date('2018-09-01'),
    endedAt: new Date('2022-06-01'),
    isCompleted: true,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

describe('UpdateEducationCommand', () => {
    let command: UpdateEducationCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.update.mockResolvedValue(makeEducation())
        mockCacheService.invalidatePublicEducation.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UpdateEducationCommand,
                { provide: 'IEducationWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<UpdateEducationCommand>(UpdateEducationCommand)
    })

    it('strips id from the payload before calling the repository', async () => {
        await command.execute({ id: 1, degreeName: 'M.Sc. Computer Science' })

        expect(mockRepo.update).toHaveBeenCalledWith(1, { degreeName: 'M.Sc. Computer Science' })
    })

    it('supports marking a degree as completed via a partial update', async () => {
        await command.execute({ id: 1, isCompleted: true, endedAt: new Date('2024-01-01') })

        expect(mockRepo.update).toHaveBeenCalledWith(1, {
            isCompleted: true,
            endedAt: new Date('2024-01-01'),
        })
    })

    it('invalidates the public education cache after update', async () => {
        await command.execute({ id: 1, degreeName: 'x' })

        expect(mockCacheService.invalidatePublicEducation).toHaveBeenCalledTimes(1)
    })

    it('maps the updated entity to an EducationDTO', async () => {
        mockRepo.update.mockResolvedValue(makeEducation({ id: 1, degreeName: 'Updated Degree' }))

        const result = await command.execute({ id: 1, degreeName: 'Updated Degree' })

        expect(result.degreeName).toBe('Updated Degree')
    })

    it('propagates an error if the repository throws (e.g. record not found)', async () => {
        mockRepo.update.mockRejectedValue(new Error('not found'))

        await expect(command.execute({ id: 999, degreeName: 'x' })).rejects.toThrow('not found')
    })
})
