/**
 * @fileoverview CreateBlogCommand Unit Tests
 *
 * Tests blog creation logic and cache invalidation behavior.
 * Repository and cache service are fully mocked — no DB, no Redis.
 *
 * Key behaviors tested:
 * - Slug is generated from title
 * - Cache always invalidates public blog list on create
 * - Slug cache only invalidated when blog is published
 * - Draft creation does not invalidate slug cache
 */

import { Test, TestingModule } from '@nestjs/testing'
import { CreateBlogCommand } from './CreateBlogCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../infrastructure/cache/cache.module'

// =============================================================================
// Mocks
// =============================================================================

const mockRepo = {
    create: jest.fn(),
}

const mockCacheService = {
    invalidatePublicBlogs: jest.fn(),
    invalidateBlogBySlug: jest.fn(),
}

// =============================================================================
// Helpers
// =============================================================================

/** Minimal valid blog input */
const makeInput = (overrides = {}) => ({
    title: 'My First Blog Post',
    content: 'This is the content of the blog post.',
    excerpt: 'Short excerpt',
    tags: ['nestjs', 'typescript'],
    isPublished: false,
    userId: 1,
    ...overrides,
})

/** Minimal blog entity returned by the repo */
const makeBlog = (overrides = {}) => ({
    id: 1,
    title: 'My First Blog Post',
    slug: 'my-first-blog-post',
    content: 'This is the content of the blog post.',
    excerpt: 'Short excerpt',
    tags: [{ id: 1, name: 'nestjs', blogId: 1 }],
    isPublished: false,
    publishedAt: null,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

// =============================================================================
// Suite
// =============================================================================

describe('CreateBlogCommand', () => {
    let command: CreateBlogCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.create.mockResolvedValue(makeBlog())
        mockCacheService.invalidatePublicBlogs.mockResolvedValue(undefined)
        mockCacheService.invalidateBlogBySlug.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateBlogCommand,
                { provide: 'IBlogWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<CreateBlogCommand>(CreateBlogCommand)
    })

    // ===========================================================================
    // Slug generation
    // ===========================================================================
    describe('slug generation', () => {
        it('generates slug from title and passes it to repo', async () => {
            await command.execute(makeInput({ title: 'My First Blog Post' }))

            expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'my-first-blog-post' }))
        })

        it('generates slug for titles with special characters', async () => {
            await command.execute(makeInput({ title: 'Hello, World! & More' }))

            expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'hello-world-more' }))
        })

        it('generates slug for Vietnamese titles', async () => {
            await command.execute(makeInput({ title: 'Lâm Tấn Phú học NestJS' }))

            expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'lam-tan-phu-hoc-nestjs' }))
        })
    })

    // ===========================================================================
    // Cache invalidation — published blog
    // ===========================================================================
    describe('cache invalidation — published blog', () => {
        it('always invalidates public blog list on create', async () => {
            await command.execute(makeInput({ isPublished: true }))

            expect(mockCacheService.invalidatePublicBlogs).toHaveBeenCalledTimes(1)
        })

        it('invalidates slug cache when blog is published', async () => {
            await command.execute(
                makeInput({
                    title: 'My Published Post',
                    isPublished: true,
                }),
            )

            expect(mockCacheService.invalidateBlogBySlug).toHaveBeenCalledWith('my-published-post')
        })

        it('sets publishedAt when blog is published', async () => {
            await command.execute(makeInput({ isPublished: true }))

            expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ publishedAt: expect.any(Date) }))
        })
    })

    // ===========================================================================
    // Cache invalidation — draft blog
    // ===========================================================================
    describe('cache invalidation — draft blog', () => {
        it('still invalidates public blog list on draft create', async () => {
            await command.execute(makeInput({ isPublished: false }))

            expect(mockCacheService.invalidatePublicBlogs).toHaveBeenCalledTimes(1)
        })

        it('does NOT invalidate slug cache for draft', async () => {
            await command.execute(makeInput({ isPublished: false }))

            expect(mockCacheService.invalidateBlogBySlug).not.toHaveBeenCalled()
        })

        it('sets publishedAt to null for draft', async () => {
            await command.execute(makeInput({ isPublished: false }))

            expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ publishedAt: null }))
        })
    })

    // ===========================================================================
    // Optional fields
    // ===========================================================================
    describe('optional fields', () => {
        it('defaults excerpt to null when not provided', async () => {
            await command.execute(makeInput({ excerpt: undefined }))

            expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ excerpt: null }))
        })

        it('defaults tags to empty array when not provided', async () => {
            await command.execute(makeInput({ tags: undefined }))

            expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ tags: [] }))
        })
    })
})
