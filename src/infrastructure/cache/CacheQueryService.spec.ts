/**
 * @fileoverview CacheQueryService Unit Tests
 *
 * Tests caching behavior in isolation.
 * CACHE_MANAGER is fully mocked — no Redis connection required.
 *
 * Key behaviors tested:
 * - Fresh cache hit (returns cached data, no factory call)
 * - Stale-While-Revalidate (returns stale data, triggers background refresh)
 * - Cache miss (calls factory, stores result)
 * - Force refresh (bypasses cache entirely)
 * - Retry logic on factory failure
 */

import { Test, TestingModule } from '@nestjs/testing'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { CacheQueryService } from './CacheQueryService'

// =============================================================================
// Helpers
// =============================================================================

/** Builds a cache envelope with configurable staleness */
const makeEnvelope = <T>(data: T, options: {
  fresh?: boolean
  stale?: boolean
} = {}) => {
  const now = Date.now()

  return {
    data,
    // fresh=true → expiresAt is in the future
    // fresh=false, stale=true → expiresAt is past but staleUntil is future
    // fresh=false, stale=false → both in the past (fully expired)
    expiresAt:  options.fresh !== false ? now + 60_000 : now - 1_000,
    staleUntil: options.stale !== false ? now + 120_000 : now - 1_000,
  }
}

// =============================================================================
// Mocks
// =============================================================================

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}

// =============================================================================
// Suite
// =============================================================================

describe('CacheQueryService', () => {
  let service: CacheQueryService

  beforeEach(async () => {
    jest.clearAllMocks()
    mockCacheManager.set.mockResolvedValue(undefined)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheQueryService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile()

    service = module.get<CacheQueryService>(CacheQueryService)
  })

  // ===========================================================================
  // getOrSet() — cache hit scenarios
  // ===========================================================================
  describe('getOrSet() — cache hits', () => {
    it('returns cached data immediately on a fresh hit without calling factory', async () => {
      const factory = jest.fn()
      mockCacheManager.get.mockResolvedValue(makeEnvelope('cached-value', { fresh: true }))

      const result = await service.getOrSet('my-key', 60, factory)

      expect(result).toBe('cached-value')
      expect(factory).not.toHaveBeenCalled()
    })

    it('returns stale data and triggers background refresh on stale hit', async () => {
      const factory = jest.fn().mockResolvedValue('fresh-value')
      mockCacheManager.get.mockResolvedValue(
        makeEnvelope('stale-value', { fresh: false, stale: true })
      )

      const result = await service.getOrSet('my-key', 60, factory)

      // Should immediately return stale data
      expect(result).toBe('stale-value')

      // Background refresh fires asynchronously — wait for it
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(factory).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================================================
  // getOrSet() — cache miss scenarios
  // ===========================================================================
  describe('getOrSet() — cache miss', () => {
    it('calls factory and stores result on cache miss', async () => {
      const factory = jest.fn().mockResolvedValue('fresh-data')
      mockCacheManager.get.mockResolvedValue(null)

      const result = await service.getOrSet('my-key', 60, factory)

      expect(result).toBe('fresh-data')
      expect(factory).toHaveBeenCalledTimes(1)
      expect(mockCacheManager.set).toHaveBeenCalledTimes(1)
    })

    it('calls factory and stores result when cache is fully expired', async () => {
      const factory = jest.fn().mockResolvedValue('new-data')
      mockCacheManager.get.mockResolvedValue(
        makeEnvelope('old-data', { fresh: false, stale: false })
      )

      const result = await service.getOrSet('my-key', 60, factory)

      expect(result).toBe('new-data')
      expect(factory).toHaveBeenCalledTimes(1)
    })

    it('namespaces the key with portfolio:v1: prefix', async () => {
      const factory = jest.fn().mockResolvedValue('data')
      mockCacheManager.get.mockResolvedValue(null)

      await service.getOrSet('blog:list', 60, factory)

      expect(mockCacheManager.get).toHaveBeenCalledWith('portfolio:v1:blog:list')
    })
  })

  // ===========================================================================
  // getOrSet() — force refresh
  // ===========================================================================
  describe('getOrSet() — forceRefresh', () => {
    it('bypasses cache and calls factory when forceRefresh is true', async () => {
      const factory = jest.fn().mockResolvedValue('forced-data')
      // Even with a fresh cache entry, force refresh should call factory
      mockCacheManager.get.mockResolvedValue(makeEnvelope('cached-data', { fresh: true }))

      const result = await service.getOrSet('my-key', 60, factory, { forceRefresh: true })

      expect(result).toBe('forced-data')
      expect(factory).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================================================
  // Retry logic
  // ===========================================================================
  describe('retry logic', () => {
    it('retries factory on failure and succeeds on second attempt', async () => {
      mockCacheManager.get.mockResolvedValue(null)

      const factory = jest.fn()
        .mockRejectedValueOnce(new Error('DB timeout'))
        .mockResolvedValueOnce('recovered-data')

      const result = await service.getOrSet('my-key', 60, factory, { retries: 1 })

      expect(result).toBe('recovered-data')
      expect(factory).toHaveBeenCalledTimes(2)
    })

    it('throws after all retries are exhausted', async () => {
      mockCacheManager.get.mockResolvedValue(null)

      const factory = jest.fn().mockRejectedValue(new Error('Persistent failure'))

      await expect(
        service.getOrSet('my-key', 60, factory, { retries: 1 })
      ).rejects.toThrow('Persistent failure')

      // 1 initial attempt + 1 retry = 2 total calls
      expect(factory).toHaveBeenCalledTimes(2)
    })
  })

  // ===========================================================================
  // delete() and deletePattern()
  // ===========================================================================
  describe('delete()', () => {
    it('deletes with namespaced key', async () => {
      mockCacheManager.del.mockResolvedValue(undefined)

      await service.delete('blog:list')

      expect(mockCacheManager.del).toHaveBeenCalledWith('portfolio:v1:blog:list')
    })
  })

  describe('deletePattern()', () => {
    it('deletes all keys matching pattern', async () => {
      const mockStore = {
        keys: jest.fn().mockResolvedValue([
          'portfolio:v1:blog:1',
          'portfolio:v1:blog:2',
        ]),
      }
      // Simulate cache manager with a store that has keys()
      ;(service as any).cache = {
        ...mockCacheManager,
        store: mockStore,
      }

      await service.deletePattern('blog:*')

      expect(mockCacheManager.del).toHaveBeenCalledTimes(2)
    })
  })

  // ===========================================================================
  // getOrSetWithProfile()
  // ===========================================================================
  describe('getOrSetWithProfile()', () => {
    it('uses correct TTL values for MEDIUM profile', async () => {
      const factory = jest.fn().mockResolvedValue('data')
      mockCacheManager.get.mockResolvedValue(null)

      await service.getOrSetWithProfile('my-key', 'MEDIUM', factory)

      // MEDIUM = fresh: 300, stale: 1800 → physical TTL = 300 + 1800 + 180 = 2280
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'portfolio:v1:my-key',
        expect.objectContaining({ data: 'data' }),
        2280,
      )
    })
  })
})