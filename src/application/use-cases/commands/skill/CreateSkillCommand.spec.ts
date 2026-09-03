/**
 * @fileoverview CreateSkillCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { CreateSkillCommand } from './CreateSkillCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    create: jest.fn(),
}

const mockCacheService = {
    invalidatePublicSkills: jest.fn(),
}

const makeInput = (overrides = {}) => ({
    name: 'TypeScript',
    imageUrl: 'https://cdn.example.com/typescript.svg',
    category: 'backend' as const,
    isPublic: true,
    userId: 1,
    ...overrides,
})

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

describe('CreateSkillCommand', () => {
    let command: CreateSkillCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.create.mockResolvedValue(makeSkill())
        mockCacheService.invalidatePublicSkills.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateSkillCommand,
                { provide: 'ISkillWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<CreateSkillCommand>(CreateSkillCommand)
    })

    it('passes the input straight through to the repository', async () => {
        const input = makeInput()

        await command.execute(input)

        expect(mockRepo.create).toHaveBeenCalledWith(input)
    })

    it('invalidates the public skills cache after create', async () => {
        await command.execute(makeInput())

        expect(mockCacheService.invalidatePublicSkills).toHaveBeenCalledTimes(1)
    })

    it('maps the created entity to a SkillDTO', async () => {
        mockRepo.create.mockResolvedValue(makeSkill({ id: 2, name: 'Rust', category: 'other' }))

        const result = await command.execute(makeInput({ name: 'Rust', category: 'other' }))

        expect(result).toEqual({
            id: 2,
            name: 'Rust',
            imageUrl: 'https://cdn.example.com/typescript.svg',
            category: 'other',
        })
    })

    it('handles a null imageUrl', async () => {
        mockRepo.create.mockResolvedValue(makeSkill({ imageUrl: null }))

        const result = await command.execute(makeInput({ imageUrl: null }))

        expect(result.imageUrl).toBeNull()
    })
})
