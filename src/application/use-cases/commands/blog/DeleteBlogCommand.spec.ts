/**
 * @fileoverview DeleteBlogCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 *
 * Key behaviors tested:
 * - Throws NotFoundError when the blog doesn't exist, without deleting or invalidating cache
 * - Deletes via write repo and invalidates both the public list and the specific slug
 */

import { Test, TestingModule } from '@nestjs/testing'
import { DeleteBlogCommand } from './DeleteBlogCommand'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import { CACHE_INVALIDATION_SERVICE } from '../../../../infrastructure/cache/cache.module'

const mockReadRepo = {
    findById: jest.fn(),
}

const mockWriteRepo = {
    delete: jest.fn(),
}

const mockCacheService = {
    invalidatePublicBlogs: jest.fn(),
    invalidateBlogBySlug: jest.fn(),
}

const makeBlog = (overrides = {}) => ({
    id: 1,
    title: 'A Post',
    slug: 'a-post',
    content: 'Content',
    excerpt: null,
    tags: [],
    isPublished: true,
    publishedAt: new Date(),
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

describe('DeleteBlogCommand', () => {
    let command: DeleteBlogCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockReadRepo.findById.mockResolvedValue(makeBlog())
        mockWriteRepo.delete.mockResolvedValue(undefined)
        mockCacheService.invalidatePublicBlogs.mockResolvedValue(undefined)
        mockCacheService.invalidateBlogBySlug.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeleteBlogCommand,
                { provide: 'IBlogReadRepository', useValue: mockReadRepo },
                { provide: 'IBlogWriteRepository', useValue: mockWriteRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<DeleteBlogCommand>(DeleteBlogCommand)
    })

    describe('execute() — not found', () => {
        it('throws NotFoundError when the blog does not exist', async () => {
            mockReadRepo.findById.mockResolvedValue(null)

            await expect(command.execute(999)).rejects.toThrow(NotFoundError)
        })

        it('does not call writeRepo.delete when the blog does not exist', async () => {
            mockReadRepo.findById.mockResolvedValue(null)

            await expect(command.execute(999)).rejects.toThrow()
            expect(mockWriteRepo.delete).not.toHaveBeenCalled()
        })

        it('does not invalidate any cache when the blog does not exist', async () => {
            mockReadRepo.findById.mockResolvedValue(null)

            await expect(command.execute(999)).rejects.toThrow()
            expect(mockCacheService.invalidatePublicBlogs).not.toHaveBeenCalled()
            expect(mockCacheService.invalidateBlogBySlug).not.toHaveBeenCalled()
        })
    })

    describe('execute() — happy path', () => {
        it('deletes the blog by id', async () => {
            await command.execute(1)

            expect(mockWriteRepo.delete).toHaveBeenCalledWith(1)
        })

        it('invalidates the public blog list', async () => {
            await command.execute(1)

            expect(mockCacheService.invalidatePublicBlogs).toHaveBeenCalledTimes(1)
        })

        it('invalidates the specific slug that was deleted', async () => {
            mockReadRepo.findById.mockResolvedValue(makeBlog({ slug: 'my-deleted-post' }))

            await command.execute(1)

            expect(mockCacheService.invalidateBlogBySlug).toHaveBeenCalledWith('my-deleted-post')
        })
    })
})
