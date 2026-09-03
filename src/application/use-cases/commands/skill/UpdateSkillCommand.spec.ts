/**
 * @fileoverview UpdateSkillCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { UpdateSkillCommand } from './UpdateSkillCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    update: jest.fn(),
}

const mockCacheService = {
    invalidatePublicSkills: jest.fn(),
}

const makeSkill = (overrides = {}) => ({
    id: 1,
    name: 'TypeScript',
    imageUrl: 'https://cdn.example.com/typescript.svg',
    category: 'backend' as const,
    isPublic: true,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

describe('UpdateSkillCommand', () => {
    let command: UpdateSkillCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.update.mockResolvedValue(makeSkill())
        mockCacheService.invalidatePublicSkills.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UpdateSkillCommand,
                { provide: 'ISkillWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<UpdateSkillCommand>(UpdateSkillCommand)
    })

    it('strips id from the payload before calling the repository', async () => {
        await command.execute({ id: 1, name: 'JavaScript' })

        expect(mockRepo.update).toHaveBeenCalledWith(1, { name: 'JavaScript' })
    })

    it('supports hiding a skill via a partial update', async () => {
        await command.execute({ id: 1, isPublic: false })

        expect(mockRepo.update).toHaveBeenCalledWith(1, { isPublic: false })
    })

    it('invalidates the public skills cache after update', async () => {
        await command.execute({ id: 1, name: 'x' })

        expect(mockCacheService.invalidatePublicSkills).toHaveBeenCalledTimes(1)
    })

    it('maps the updated entity to a SkillDTO', async () => {
        mockRepo.update.mockResolvedValue(makeSkill({ name: 'Go', category: 'devops' }))

        const result = await command.execute({ id: 1, name: 'Go', category: 'devops' })

        expect(result).toEqual({
            id: 1,
            name: 'Go',
            imageUrl: 'https://cdn.example.com/typescript.svg',
            category: 'devops',
        })
    })

    it('propagates an error if the repository throws (e.g. skill not found)', async () => {
        mockRepo.update.mockRejectedValue(new Error('not found'))

        await expect(command.execute({ id: 999, name: 'x' })).rejects.toThrow('not found')
    })
})
