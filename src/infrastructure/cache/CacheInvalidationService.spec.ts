/**
 * @fileoverview CacheInvalidationService Unit Tests
 *
 * Tests cache key namespacing, single-key deletion, and pattern-based deletion.
 * CACHE_MANAGER is fully mocked — no Redis connection required.
 *
 * Key behaviors tested:
 * - All public methods use correct namespaced keys
 * - deletePattern does NOT double-namespace keys
 * - Pattern scan deletes all matched keys
 * - Graceful degradation when store.keys() is unavailable
 */

import { Test, TestingModule } from '@nestjs/testing'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { CacheInvalidationService } from './CacheInvalidationService'

// =============================================================================
// Mocks
// =============================================================================

const mockDel  = jest.fn()
const mockKeys = jest.fn()

const mockCacheManager = {
    del:   mockDel,
    store: { keys: mockKeys },
}

// =============================================================================
// Suite
// =============================================================================

describe('CacheInvalidationService', () => {
    let service: CacheInvalidationService

    beforeEach(async () => {
        jest.clearAllMocks()
        mockDel.mockResolvedValue(undefined)
        mockKeys.mockResolvedValue([])

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CacheInvalidationService,
                { provide: CACHE_MANAGER, useValue: mockCacheManager },
            ],
        }).compile()

        service = module.get<CacheInvalidationService>(CacheInvalidationService)
    })

  // ===========================================================================
  // Namespacing — single key deletions
  // ===========================================================================
    describe('namespacing', () => {
        it('invalidatePublicBlogs deletes portfolio:v1:blog:list:public', async () => {
            await service.invalidatePublicBlogs()
            expect(mockDel).toHaveBeenCalledWith('portfolio:v1:blog:list:public')
        })

        it('invalidateBlogBySlug deletes portfolio:v1:blog:{slug}', async () => {
            await service.invalidateBlogBySlug('my-blog-post')
            expect(mockDel).toHaveBeenCalledWith('portfolio:v1:blog:my-blog-post')
        })

        it('invalidatePublicProjects deletes portfolio:v1:project:list:public', async () => {
            await service.invalidatePublicProjects()
            expect(mockDel).toHaveBeenCalledWith('portfolio:v1:project:list:public')
        })

        it('invalidateProjectBySlug deletes portfolio:v1:project:{slug}', async () => {
            await service.invalidateProjectBySlug('my-project')
            expect(mockDel).toHaveBeenCalledWith('portfolio:v1:project:my-project')
        })

        it('invalidatePublicSkills deletes portfolio:v1:skill:list:public', async () => {
            await service.invalidatePublicSkills()
            expect(mockDel).toHaveBeenCalledWith('portfolio:v1:skill:list:public')
        })

        it('invalidatePublicCertifications deletes portfolio:v1:certification:list:public', async () => {
            await service.invalidatePublicCertifications()
            expect(mockDel).toHaveBeenCalledWith('portfolio:v1:certification:list:public')
        })

        it('invalidatePublicEducation deletes portfolio:v1:education:list:public', async () => {
            await service.invalidatePublicEducation()
            expect(mockDel).toHaveBeenCalledWith('portfolio:v1:education:list:public')
        })

        it('invalidatePublicJobs deletes portfolio:v1:job:list:public', async () => {
            await service.invalidatePublicJobs()
            expect(mockDel).toHaveBeenCalledWith('portfolio:v1:job:list:public')
        })

        it('invalidatePublicSocialAccounts deletes portfolio:v1:social:list:public', async () => {
            await service.invalidatePublicSocialAccounts()
            expect(mockDel).toHaveBeenCalledWith('portfolio:v1:social:list:public')
        })
    })

  // ===========================================================================
  // deletePattern — no double-namespacing
  // ===========================================================================
    describe('deletePattern — namespacing', () => {
        it('scans with portfolio:v1:blog:* — not portfolio:v1:portfolio:v1:blog:*', async () => {
            mockKeys.mockResolvedValue([])

            await service.invalidateAllBlogs()

            expect(mockKeys).toHaveBeenCalledWith('portfolio:v1:blog:*')
            expect(mockKeys).not.toHaveBeenCalledWith('portfolio:v1:portfolio:v1:blog:*')
        })

        it('scans with portfolio:v1:project:* for invalidateAllProjects', async () => {
            mockKeys.mockResolvedValue([])

            await service.invalidateAllProjects()

            expect(mockKeys).toHaveBeenCalledWith('portfolio:v1:project:*')
        })
    })

  // ===========================================================================
  // deletePattern — bulk deletion
  // ===========================================================================
    describe('deletePattern — bulk deletion', () => {
        it('deletes all keys returned by store.keys()', async () => {
            mockKeys.mockResolvedValue([
                'portfolio:v1:blog:post-1',
                'portfolio:v1:blog:post-2',
                'portfolio:v1:blog:list:public',
        ])

            await service.invalidateAllBlogs()

            expect(mockDel).toHaveBeenCalledTimes(3)
            expect(mockDel).toHaveBeenCalledWith('portfolio:v1:blog:post-1')
            expect(mockDel).toHaveBeenCalledWith('portfolio:v1:blog:post-2')
            expect(mockDel).toHaveBeenCalledWith('portfolio:v1:blog:list:public')
        })

        it('does nothing when no keys match the pattern', async () => {
            mockKeys.mockResolvedValue([])

            await service.invalidateAllBlogs()

            expect(mockDel).not.toHaveBeenCalled()
        })
    })

  // ===========================================================================
  // Graceful degradation
  // ===========================================================================
    describe('graceful degradation', () => {
        it('does not throw when store.keys() is unavailable', async () => {
        // Simulate a cache store without Redis key scanning
        const simpleManager = { del: mockDel, store: {} }
        const simpleModule = await Test.createTestingModule({
            providers: [
                CacheInvalidationService,
                { provide: CACHE_MANAGER, useValue: simpleManager },
            ],
        }).compile()

        const simpleService = simpleModule.get<CacheInvalidationService>(CacheInvalidationService)

            await expect(simpleService.invalidateAllBlogs()).resolves.not.toThrow()
        })

        it('does not throw when del() fails on a single key', async () => {
            mockDel.mockRejectedValue(new Error('Redis connection lost'))

            await expect(service.invalidatePublicBlogs()).resolves.not.toThrow()
        })
    })

  // ===========================================================================
  // invalidatePattern — public advanced API
  // ===========================================================================
    describe('invalidatePattern()', () => {
        it('delegates to deletePattern with correct namespaced key', async () => {
            mockKeys.mockResolvedValue(['portfolio:v1:custom:1'])

            await service.invalidatePattern('custom:*')

            expect(mockKeys).toHaveBeenCalledWith('portfolio:v1:custom:*')
            expect(mockDel).toHaveBeenCalledWith('portfolio:v1:custom:1')
        })
    })
})