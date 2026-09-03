/**
 * @fileoverview DeleteProjectCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 *
 * Key behaviors tested:
 * - Reads the project first (to capture its slug) before deleting
 * - Always invalidates the public project list
 * - Invalidates the specific slug cache only when the project was found
 * - Does not throw when the project is already gone — delete is idempotent
 */

import { Test, TestingModule } from '@nestjs/testing'
import { DeleteProjectCommand } from './DeleteProjectCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockReadRepo = {
    findById: jest.fn(),
}

const mockWriteRepo = {
    delete: jest.fn(),
}

const mockCacheService = {
    invalidatePublicProjects: jest.fn(),
    invalidateProjectBySlug: jest.fn(),
}

const makeProject = (overrides = {}) => ({
    id: 1,
    name: 'My Portfolio Backend',
    description: 'desc',
    slug: 'my-portfolio-backend',
    techStack: [],
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

describe('DeleteProjectCommand', () => {
    let command: DeleteProjectCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockReadRepo.findById.mockResolvedValue(makeProject())
        mockWriteRepo.delete.mockResolvedValue(undefined)
        mockCacheService.invalidatePublicProjects.mockResolvedValue(undefined)
        mockCacheService.invalidateProjectBySlug.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeleteProjectCommand,
                { provide: 'IProjectReadRepository', useValue: mockReadRepo },
                { provide: 'IProjectWriteRepository', useValue: mockWriteRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<DeleteProjectCommand>(DeleteProjectCommand)
    })

    it('deletes the project by id', async () => {
        await command.execute(1)

        expect(mockWriteRepo.delete).toHaveBeenCalledWith(1)
    })

    it('always invalidates the public project list', async () => {
        await command.execute(1)

        expect(mockCacheService.invalidatePublicProjects).toHaveBeenCalledTimes(1)
    })

    it("invalidates the cache for the deleted project's slug", async () => {
        mockReadRepo.findById.mockResolvedValue(makeProject({ slug: 'to-be-deleted' }))

        await command.execute(1)

        expect(mockCacheService.invalidateProjectBySlug).toHaveBeenCalledWith('to-be-deleted')
    })

    it('does not attempt slug cache invalidation when the project no longer exists', async () => {
        mockReadRepo.findById.mockResolvedValue(null)

        await command.execute(999)

        expect(mockCacheService.invalidateProjectBySlug).not.toHaveBeenCalled()
    })

    it('still calls delete and invalidates the public list even when findById returns null', async () => {
        mockReadRepo.findById.mockResolvedValue(null)

        await command.execute(999)

        expect(mockWriteRepo.delete).toHaveBeenCalledWith(999)
        expect(mockCacheService.invalidatePublicProjects).toHaveBeenCalledTimes(1)
    })
})
