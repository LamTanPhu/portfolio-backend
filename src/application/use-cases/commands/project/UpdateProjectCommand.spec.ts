/**
 * @fileoverview UpdateProjectCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 *
 * Key behaviors tested:
 * - Always invalidates the public project list
 * - Only invalidates the slug cache when slug is part of the update payload
 * - Does not invalidate slug cache when slug is left unchanged (omitted)
 */

import { Test, TestingModule } from '@nestjs/testing'
import { UpdateProjectCommand } from './UpdateProjectCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    update: jest.fn(),
}

const mockCacheService = {
    invalidatePublicProjects: jest.fn(),
    invalidateProjectBySlug: jest.fn(),
}

const makeProject = (overrides = {}) => ({
    id: 1,
    name: 'My Portfolio Backend',
    description: 'A clean-architecture NestJS backend.',
    slug: 'my-portfolio-backend',
    techStack: ['NestJS'],
    repoUrl: null,
    liveUrl: null,
    thumbnailUrl: null,
    isPublished: true,
    isOpenSource: true,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

describe('UpdateProjectCommand', () => {
    let command: UpdateProjectCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.update.mockResolvedValue(makeProject())
        mockCacheService.invalidatePublicProjects.mockResolvedValue(undefined)
        mockCacheService.invalidateProjectBySlug.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UpdateProjectCommand,
                { provide: 'IProjectWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<UpdateProjectCommand>(UpdateProjectCommand)
    })

    it('strips id from the payload before calling the repository', async () => {
        await command.execute({ id: 1, name: 'New Name' })

        expect(mockRepo.update).toHaveBeenCalledWith(1, { name: 'New Name' })
    })

    it('always invalidates the public project list', async () => {
        await command.execute({ id: 1, name: 'x' })

        expect(mockCacheService.invalidatePublicProjects).toHaveBeenCalledTimes(1)
    })

    it('invalidates the slug cache when slug is part of the update', async () => {
        await command.execute({ id: 1, slug: 'new-slug' })

        expect(mockCacheService.invalidateProjectBySlug).toHaveBeenCalledWith('new-slug')
    })

    it('does not invalidate any slug cache when slug is not part of the update', async () => {
        await command.execute({ id: 1, name: 'x' })

        expect(mockCacheService.invalidateProjectBySlug).not.toHaveBeenCalled()
    })

    it('maps the updated entity to a ProjectDTO', async () => {
        mockRepo.update.mockResolvedValue(makeProject({ name: 'Updated Name' }))

        const result = await command.execute({ id: 1, name: 'Updated Name' })

        expect(result.name).toBe('Updated Name')
    })

    it('propagates an error if the repository throws (e.g. project not found)', async () => {
        mockRepo.update.mockRejectedValue(new Error('not found'))

        await expect(command.execute({ id: 999, name: 'x' })).rejects.toThrow('not found')
    })
})
