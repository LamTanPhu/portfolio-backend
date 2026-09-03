/**
 * @fileoverview CreateSocialAccountCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { CreateSocialAccountCommand } from './CreateSocialAccountCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    create: jest.fn(),
}

const mockCacheService = {
    invalidatePublicSocialAccounts: jest.fn(),
}

const makeInput = (overrides = {}) => ({
    name: 'GitHub',
    url: 'https://github.com/me',
    imageUrl: 'https://cdn.example.com/github.svg',
    isPublic: true,
    userId: 1,
    ...overrides,
})

const makeAccount = (overrides = {}) => ({
    id: 1,
    name: 'GitHub',
    url: 'https://github.com/me',
    imageUrl: 'https://cdn.example.com/github.svg',
    isPublic: true,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

describe('CreateSocialAccountCommand', () => {
    let command: CreateSocialAccountCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.create.mockResolvedValue(makeAccount())
        mockCacheService.invalidatePublicSocialAccounts.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateSocialAccountCommand,
                { provide: 'ISocialAccountWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<CreateSocialAccountCommand>(CreateSocialAccountCommand)
    })

    it('passes the input straight through to the repository', async () => {
        const input = makeInput()

        await command.execute(input)

        expect(mockRepo.create).toHaveBeenCalledWith(input)
    })

    it('invalidates the public social accounts cache after create', async () => {
        await command.execute(makeInput())

        expect(mockCacheService.invalidatePublicSocialAccounts).toHaveBeenCalledTimes(1)
    })

    it('maps the created entity to a SocialAccountDTO', async () => {
        mockRepo.create.mockResolvedValue(makeAccount({ id: 3, name: 'LinkedIn', isPublic: false }))

        const result = await command.execute(makeInput({ name: 'LinkedIn', isPublic: false }))

        expect(result).toEqual({
            id: 3,
            name: 'LinkedIn',
            url: 'https://github.com/me',
            imageUrl: 'https://cdn.example.com/github.svg',
            isPublic: false,
        })
    })
})
