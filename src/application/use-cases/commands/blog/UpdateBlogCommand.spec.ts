/**
 * @fileoverview UpdateBlogCommand Unit Tests
 *
 * Tests blog update logic and cache invalidation behavior.
 * All repositories and cache service are fully mocked — no DB, no Redis.
 *
 * Key behaviors tested:
 * - Throws NotFoundError when blog does not exist
 * - Always invalidates public list and existing slug
 * - Invalidates new slug when slug changes
 * - Does not double-invalidate when slug is unchanged
 * - Auto-sets publishedAt when publishing for first time
 * - Does not mutate caller input
 */

import { Test, TestingModule } from '@nestjs/testing'
import { UpdateBlogCommand } from './UpdateBlogCommand'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import { CACHE_INVALIDATION_SERVICE } from '../../../../infrastructure/cache/cache.module'

// =============================================================================
// Local types
//
// FIX (eslint): mockReadRepo.findById / mockWriteRepo.update were plain
// `jest.fn()` with no generics, which TypeScript infers as `Mock<any, any>`.
// Every downstream read of `.mock.calls[...]` therefore resolved to `any`,
// tripping @typescript-eslint/no-unsafe-assignment / no-unsafe-member-access
// wherever that value was assigned to a variable or had a property accessed
// on it. Typing the mocks against the real repo shapes removes the `any` at
// the source instead of casting it away at each call site.
// =============================================================================

interface BlogRecord {
    id: number
    title: string
    slug: string
    content: string
    excerpt: string | null
    tags: any[]
    isPublished: boolean
    publishedAt: Date | null
    userId: number
    createdAt: Date
    updatedAt: Date
}

interface UpdateBlogWriteData {
    title?: string
    content?: string
    excerpt?: string | null
    tags?: any[]
    isPublished?: boolean
    publishedAt?: Date
}

// =============================================================================
// Mocks
// =============================================================================

const mockReadRepo = {
    findById: jest.fn() as jest.MockedFunction<(id: number) => Promise<BlogRecord | null>>,
}

const mockWriteRepo = {
    update: jest.fn() as jest.MockedFunction<(id: number, data: UpdateBlogWriteData) => Promise<BlogRecord>>,
}

const mockCacheService = {
    invalidatePublicBlogs: jest.fn() as jest.MockedFunction<() => Promise<void>>,
    invalidateBlogBySlug: jest.fn() as jest.MockedFunction<(slug: string) => Promise<void>>,
}

// =============================================================================
// Helpers
// =============================================================================

interface BlogOverrides {
    id?: number
    title?: string
    slug?: string
    content?: string
    excerpt?: string | null
    tags?: any[]
    isPublished?: boolean
    publishedAt?: Date | null
    userId?: number
    createdAt?: Date
    updatedAt?: Date
}

interface InputOverrides {
    id?: number
    title?: string
    content?: string
    isPublished?: boolean
    publishedAt?: Date | null
    excerpt?: string | null
    tags?: string[]
}

const makeExistingBlog = (overrides: BlogOverrides = {}) => ({
    id: 1,
    title: 'Original Title',
    slug: 'original-title',
    content: 'Original content',
    excerpt: null,
    tags: [],
    isPublished: false,
    publishedAt: null,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

const makeUpdatedBlog = (overrides: BlogOverrides = {}) => ({
    ...makeExistingBlog(),
    ...overrides,
})

const makeInput = (overrides: InputOverrides = {}) => ({
    id: 1,
    title: 'Updated Title',
    content: 'Updated content',
    isPublished: false,
    ...overrides,
})

// =============================================================================
// Suite
// =============================================================================

describe('UpdateBlogCommand', () => {
    let command: UpdateBlogCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockReadRepo.findById.mockResolvedValue(makeExistingBlog())
        mockWriteRepo.update.mockResolvedValue(makeUpdatedBlog({ slug: 'original-title' }))
        mockCacheService.invalidatePublicBlogs.mockResolvedValue(undefined)
        mockCacheService.invalidateBlogBySlug.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UpdateBlogCommand,
                { provide: 'IBlogReadRepository', useValue: mockReadRepo },
                { provide: 'IBlogWriteRepository', useValue: mockWriteRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<UpdateBlogCommand>(UpdateBlogCommand)
    })

    // ===========================================================================
    // Not found
    // ===========================================================================
    describe('execute() — not found', () => {
        it('throws NotFoundError when blog does not exist', async () => {
            mockReadRepo.findById.mockResolvedValue(null)

            await expect(command.execute(makeInput({ id: 999 }))).rejects.toThrow(NotFoundError)
        })

        it('does not call writeRepo when blog does not exist', async () => {
            mockReadRepo.findById.mockResolvedValue(null)

            await expect(command.execute(makeInput())).rejects.toThrow()
            expect(mockWriteRepo.update).not.toHaveBeenCalled()
        })

        it('does not invalidate cache when blog does not exist', async () => {
            mockReadRepo.findById.mockResolvedValue(null)

            await expect(command.execute(makeInput())).rejects.toThrow()
            expect(mockCacheService.invalidatePublicBlogs).not.toHaveBeenCalled()
            expect(mockCacheService.invalidateBlogBySlug).not.toHaveBeenCalled()
        })
    })

    // ===========================================================================
    // Cache invalidation — slug unchanged
    // ===========================================================================
    describe('execute() — cache invalidation, slug unchanged', () => {
        it('always invalidates public blog list', async () => {
            await command.execute(makeInput())

            expect(mockCacheService.invalidatePublicBlogs).toHaveBeenCalledTimes(1)
        })

        it('invalidates existing slug', async () => {
            await command.execute(makeInput())

            expect(mockCacheService.invalidateBlogBySlug).toHaveBeenCalledWith('original-title')
        })

        it('does not double-invalidate when slug is unchanged', async () => {
            await command.execute(makeInput())

            expect(mockCacheService.invalidateBlogBySlug).toHaveBeenCalledTimes(1)
        })
    })

    // ===========================================================================
    // Cache invalidation — slug is immutable
    //
    // FIX: removed a "slug changed" test that mocked writeRepo.update() to
    // return a different slug than the one passed in. That can't happen for
    // real — UpdateBlogInput has no `slug` field (see IBlogWriteRepository.ts),
    // so the command has no way to change it. This test was covering a branch
    // in UpdateBlogCommand that has since been removed as unreachable dead code.
    // ===========================================================================

    // ===========================================================================
    // publishedAt handling
    // ===========================================================================
    describe('execute() — publishedAt handling', () => {
        it('auto-sets publishedAt when publishing for first time', async () => {
            mockWriteRepo.update.mockResolvedValue(makeUpdatedBlog({ isPublished: true, publishedAt: new Date() }))

            await command.execute(makeInput({ isPublished: true, publishedAt: undefined }))

            expect(mockWriteRepo.update).toHaveBeenCalledWith(
                1,
                // jest's expect.any() is typed to return `any` — not fixable by
                // typing the mock, so it's disabled narrowly right here.
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                expect.objectContaining({ publishedAt: expect.any(Date) }),
            )
        })

        it('does not override publishedAt if already set', async () => {
            const existingDate = new Date('2025-01-01')

            await command.execute(makeInput({ isPublished: true, publishedAt: existingDate }))

            expect(mockWriteRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ publishedAt: existingDate }))
        })

        it('does not set publishedAt when keeping as draft', async () => {
            await command.execute(makeInput({ isPublished: false, publishedAt: undefined }))

            const callArgs = mockWriteRepo.update.mock.calls[0][1]
            expect(callArgs.publishedAt).toBeUndefined()
        })
    })

    // ===========================================================================
    // Input immutability
    // ===========================================================================
    describe('execute() — input immutability', () => {
        it('does not mutate the caller input object', async () => {
            const input = makeInput({ isPublished: true, publishedAt: undefined })
            const originalPublishedAt = input.publishedAt

            await command.execute(input)

            expect(input.publishedAt).toBe(originalPublishedAt)
        })
    })
})
