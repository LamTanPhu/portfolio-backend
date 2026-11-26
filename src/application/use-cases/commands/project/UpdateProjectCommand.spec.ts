/**
 * @fileoverview UpdateProjectCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 *
 * Key behaviors tested:
 * - Always invalidates the public project list
 * - Always invalidates the slug the project HAD before the update, even when the
 *   payload carries no slug (e.g. { isPublished: false }) — the public detail
 *   route serves only published projects, so an unpublish must not linger in cache
 * - Also invalidates the new slug on a rename, and never twice for the same slug
 */

import { Test, TestingModule } from '@nestjs/testing'
import { UpdateProjectCommand } from './UpdateProjectCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    update: jest.fn(),
}

const mockReadRepo = {
    findById: jest.fn(),
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

        mockReadRepo.findById.mockResolvedValue(makeProject())
        mockRepo.update.mockResolvedValue(makeProject())
        mockCacheService.invalidatePublicProjects.mockResolvedValue(undefined)
        mockCacheService.invalidateProjectBySlug.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UpdateProjectCommand,
                { provide: 'IProjectReadRepository', useValue: mockReadRepo },
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

    // SECURITY regression: this is the unpublish path. The payload has no slug, yet
    // the cached public detail page for the project MUST be dropped immediately.
    it('invalidates the existing slug even when the payload has no slug (unpublish)', async () => {
        mockRepo.update.mockResolvedValue(makeProject({ isPublished: false }))

        await command.execute({ id: 1, isPublished: false })

        expect(mockReadRepo.findById).toHaveBeenCalledWith(1)
        expect(mockCacheService.invalidateProjectBySlug).toHaveBeenCalledWith('my-portfolio-backend')
    })

    it('reads the existing slug BEFORE updating (after the update the old slug is gone)', async () => {
        const order: string[] = []
        mockReadRepo.findById.mockImplementation(() => {
            order.push('read')
            return Promise.resolve(makeProject())
        })
        mockRepo.update.mockImplementation(() => {
            order.push('update')
            return Promise.resolve(makeProject())
        })

        await command.execute({ id: 1, name: 'x' })

        expect(order).toEqual(['read', 'update'])
    })

    it('on a rename invalidates the OLD slug, the new slug from the payload and the stored new slug', async () => {
        mockReadRepo.findById.mockResolvedValue(makeProject({ slug: 'old-slug' }))
        mockRepo.update.mockResolvedValue(makeProject({ slug: 'new-slug' }))

        await command.execute({ id: 1, name: 'New', slug: 'new-slug' })

        const slugs = mockCacheService.invalidateProjectBySlug.mock.calls.map((call: unknown[]) => call[0])
        expect(slugs.sort()).toEqual(['new-slug', 'old-slug'])
    })

    it('invalidates an unchanged slug only once', async () => {
        await command.execute({ id: 1, slug: 'my-portfolio-backend' })

        expect(mockCacheService.invalidateProjectBySlug).toHaveBeenCalledTimes(1)
    })

    it('still invalidates the stored slug when the project was not found beforehand', async () => {
        mockReadRepo.findById.mockResolvedValue(null)

        await command.execute({ id: 1, name: 'x' })

        expect(mockCacheService.invalidateProjectBySlug).toHaveBeenCalledWith('my-portfolio-backend')
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
