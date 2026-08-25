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
 * - Retry logic with correct exponential delay
 */

import { Test, TestingModule } from '@nestjs/testing'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Keyv } from 'keyv'
import { CacheQueryService } from './CacheQueryService'

// =============================================================================
// Test-local types
// =============================================================================
// NOTE: these describe only the shape these tests read/write. If the real
// envelope or cache field in CacheQueryService.ts gains more fields, prefer
// importing the real types instead of extending these.

interface TestCacheEnvelope<T> {
    data: T
    expiresAt: number
    staleUntil: number
}

interface CacheQueryServiceTestAccess {
    cache: {
        get: jest.Mock
        set: jest.Mock
        del: jest.Mock
        stores: Keyv[]
    }
}

// =============================================================================
// Helpers
// =============================================================================

const makeEnvelope = <T>(
    data: T,

    options: { fresh?: boolean; stale?: boolean } = {},
): TestCacheEnvelope<T> => {
    const now = Date.now()
    return {
        data,
        expiresAt: options.fresh !== false ? now + 60_000 : now - 1_000,
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
            providers: [CacheQueryService, { provide: CACHE_MANAGER, useValue: mockCacheManager }],
        }).compile()

        service = module.get<CacheQueryService>(CacheQueryService)
    })

    // ===========================================================================
    // getOrSet() — cache hits
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
            mockCacheManager.get.mockResolvedValue(makeEnvelope('stale-value', { fresh: false, stale: true }))

            const result = await service.getOrSet('my-key', 60, factory)

            expect(result).toBe('stale-value')
            await new Promise((resolve) => setTimeout(resolve, 50))
            expect(factory).toHaveBeenCalledTimes(1)
        })
    })

    // ===========================================================================
    // getOrSet() — cache miss
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
            mockCacheManager.get.mockResolvedValue(makeEnvelope('old-data', { fresh: false, stale: false }))

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

        it('stores envelope with correct expiresAt in the future', async () => {
            const factory = jest.fn().mockResolvedValue('data')
            mockCacheManager.get.mockResolvedValue(null)
            const before = Date.now()

            await service.getOrSet('my-key', 60, factory)

            const calls = mockCacheManager.set.mock.calls as [string, TestCacheEnvelope<unknown>, number][]
            const envelope = calls[0][1]
            expect(envelope.expiresAt).toBeGreaterThan(before)
            expect(envelope.expiresAt).toBeLessThanOrEqual(before + 60_000 + 100)
        })

        it('stores envelope with staleUntil after expiresAt', async () => {
            const factory = jest.fn().mockResolvedValue('data')
            mockCacheManager.get.mockResolvedValue(null)

            await service.getOrSet('my-key', 60, factory, { staleTtl: 300 })

            const calls = mockCacheManager.set.mock.calls as [string, TestCacheEnvelope<unknown>, number][]
            const envelope = calls[0][1]
            expect(envelope.staleUntil).toBeGreaterThan(envelope.expiresAt)
        })
    })

    // ===========================================================================
    // getOrSet() — force refresh
    // ===========================================================================
    describe('getOrSet() — forceRefresh', () => {
        it('bypasses cache and calls factory when forceRefresh is true', async () => {
            const factory = jest.fn().mockResolvedValue('forced-data')
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

            const factory = jest
                .fn()
                .mockRejectedValueOnce(new Error('DB timeout'))
                .mockResolvedValueOnce('recovered-data')

            const result = await service.getOrSet('my-key', 60, factory, { retries: 1 })

            expect(result).toBe('recovered-data')
            expect(factory).toHaveBeenCalledTimes(2)
        })

        it('throws after all retries are exhausted', async () => {
            mockCacheManager.get.mockResolvedValue(null)

            const factory = jest.fn().mockRejectedValue(new Error('Persistent failure'))

            await expect(service.getOrSet('my-key', 60, factory, { retries: 1 })).rejects.toThrow('Persistent failure')

            expect(factory).toHaveBeenCalledTimes(2)
        })

        it('uses increasing delay between retries — not decreasing', async () => {
            mockCacheManager.get.mockResolvedValue(null)

            const callTimes: number[] = []
            const factory = jest.fn().mockImplementation(() => {
                callTimes.push(Date.now())
                if (callTimes.length < 3) throw new Error('fail')
                return 'ok'
            })

            await service.getOrSet('my-key', 60, factory, { retries: 2 })

            // With baseDelay=300: gap between attempt 1→2 should be ~300ms, 2→3 should be ~600ms
            const gap1 = callTimes[1] - callTimes[0]
            const gap2 = callTimes[2] - callTimes[1]

            expect(gap2).toBeGreaterThan(gap1) // second gap must be longer than first
        }, 10_000) // extend timeout — real delays are 300ms + 600ms = 900ms

        it('delay for second retry is double the first retry delay', async () => {
            mockCacheManager.get.mockResolvedValue(null)

            const callTimes: number[] = []
            const factory = jest.fn().mockImplementation(() => {
                callTimes.push(Date.now())
                if (callTimes.length < 3) throw new Error('fail')
                return 'ok'
            })

            await service.getOrSet('my-key', 60, factory, { retries: 2 })

            const gap1 = callTimes[1] - callTimes[0]
            const gap2 = callTimes[2] - callTimes[1]

            // gap2 should be roughly double gap1 (300ms vs 600ms)
            expect(gap2 / gap1).toBeGreaterThan(1.5)
        }, 10_000)
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
        it('deletes all keys matching pattern from a real in-memory store', async () => {
            // Real Keyv instance — the previous version of this test mocked
            // `{ store: { keys } }`, a shape that matched cache-manager v5, not
            // the v7 actually installed here (real shape: `.stores`, an array).
            // That mismatch let deletePattern() silently do nothing in production
            // while this test still passed. See CacheInvalidationService.spec.ts
            // for the full story — same bug, same fix, applied here too.
            const keyv = new Keyv()
            await keyv.set('portfolio:v1:blog:1', 'A')
            await keyv.set('portfolio:v1:blog:2', 'B')
            await keyv.set('portfolio:v1:project:1', 'C') // must survive
            ;(service as unknown as CacheQueryServiceTestAccess).cache = {
                ...mockCacheManager,
                stores: [keyv],
            }

            await service.deletePattern('blog:*')

            expect(await keyv.get('portfolio:v1:blog:1')).toBeUndefined()
            expect(await keyv.get('portfolio:v1:blog:2')).toBeUndefined()
            expect(await keyv.get('portfolio:v1:project:1')).toBe('C')
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

        it('uses correct TTL values for SHORT profile', async () => {
            const factory = jest.fn().mockResolvedValue('data')
            mockCacheManager.get.mockResolvedValue(null)

            await service.getOrSetWithProfile('my-key', 'SHORT', factory)

            // SHORT = fresh: 60, stale: 300 → physical TTL = 60 + 300 + 180 = 540
            expect(mockCacheManager.set).toHaveBeenCalledWith(
                'portfolio:v1:my-key',
                expect.objectContaining({ data: 'data' }),
                540,
            )
        })

        it('uses correct TTL values for REALTIME profile', async () => {
            const factory = jest.fn().mockResolvedValue('data')
            mockCacheManager.get.mockResolvedValue(null)

            await service.getOrSetWithProfile('my-key', 'REALTIME', factory)

            // REALTIME = fresh: 10, stale: 30 → physical TTL = 10 + 30 + 180 = 220
            expect(mockCacheManager.set).toHaveBeenCalledWith(
                'portfolio:v1:my-key',
                expect.objectContaining({ data: 'data' }),
                220,
            )
        })
    })
})
