/**
 * @fileoverview CacheInvalidationService Unit Tests
 *
 * Tests cache key namespacing and pattern-based deletion.
 *
 * IMPORTANT: the pattern-deletion tests below use a REAL `Keyv` in-memory
 * instance, not a hand-built mock of the store's shape. The previous version
 * of this file mocked `{ store: { keys: mockKeys } }` — a shape that matched
 * cache-manager v5, not the v7 actually installed in this project. Those
 * tests passed while the real code silently failed in production (cache.store
 * is undefined on v7; the real shape is cache.stores, an array). Testing
 * against a real Keyv instance here is deliberate: it can't drift from
 * reality the way a hand-shaped mock can.
 *
 * Key behaviors tested:
 * - All public methods use correct namespaced keys
 * - deletePattern does NOT double-namespace keys
 * - Pattern deletion actually removes matched keys and preserves the rest,
 *   verified against a real in-memory store
 * - Redis-shaped store uses scanIterator({MATCH, COUNT}) + unlink — the real
 *   node-redis calling convention, not ioredis's positional scan()
 * - Multiple configured stores (Redis + in-memory fallback) both get cleared
 * - Graceful degradation when one store fails or no stores are available
 */

import { Test, TestingModule } from '@nestjs/testing'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Keyv } from 'keyv'
import { CacheInvalidationService } from './CacheInvalidationService'

// =============================================================================
// Helpers
// =============================================================================

/** Builds a fake Redis-shaped store: { store: { client: { scanIterator, unlink, del } } }. */
function makeFakeRedisKeyv(keysInStore: string[]) {
    const unlink = jest.fn().mockResolvedValue(undefined)
    const del = jest.fn().mockResolvedValue(undefined)

    const scanIterator = jest.fn(function* (opts: { MATCH: string }) {
        // Real node-redis's MATCH is a glob; tests only ever use trailing '*',
        // so a prefix check is sufficient to fake matching behavior here.
        const prefix = opts.MATCH.replace(/\*+$/, '')
        for (const key of keysInStore) {
            if (key.startsWith(prefix)) yield key
        }
    })

    return {
        keyv: { store: { client: { scanIterator, unlink, del } } },
        unlink,
        del,
        scanIterator,
    }
}

/** Builds a real in-memory Keyv, pre-populated, wrapped as cache-manager v7 shapes it. */
async function makeRealMemoryKeyv(entries: Record<string, unknown>) {
    const keyv = new Keyv()
    for (const [key, value] of Object.entries(entries)) {
        await keyv.set(key, value)
    }
    return keyv
}

// =============================================================================
// Suite
// =============================================================================

describe('CacheInvalidationService', () => {
    // ===========================================================================
    // Namespacing — single key deletions (store shape irrelevant here)
    // ===========================================================================
    describe('namespacing', () => {
        const mockDel = jest.fn().mockResolvedValue(undefined)
        let service: CacheInvalidationService

        beforeEach(async () => {
            jest.clearAllMocks()
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    CacheInvalidationService,
                    { provide: CACHE_MANAGER, useValue: { del: mockDel, stores: [] } },
                ],
            }).compile()
            service = module.get(CacheInvalidationService)
        })

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

        it('does not throw when del() fails on a single key', async () => {
            mockDel.mockRejectedValueOnce(new Error('Redis connection lost'))
            await expect(service.invalidatePublicBlogs()).resolves.not.toThrow()
        })
    })

    // ===========================================================================
    // deletePattern — real in-memory store (the actual default configuration)
    // ===========================================================================
    describe('deletePattern — real in-memory store', () => {
        it('deletes only keys matching the pattern, preserves the rest', async () => {
            const keyv = await makeRealMemoryKeyv({
                'portfolio:v1:blog:post-1': 'A',
                'portfolio:v1:blog:post-2': 'B',
                'portfolio:v1:blog:list:public': 'C',
                'portfolio:v1:project:list:public': 'D', // must survive
            })

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    CacheInvalidationService,
                    { provide: CACHE_MANAGER, useValue: { del: jest.fn(), stores: [keyv] } },
                ],
            }).compile()
            const service = module.get<CacheInvalidationService>(CacheInvalidationService)

            await service.invalidateAllBlogs()

            expect(await keyv.get('portfolio:v1:blog:post-1')).toBeUndefined()
            expect(await keyv.get('portfolio:v1:blog:post-2')).toBeUndefined()
            expect(await keyv.get('portfolio:v1:blog:list:public')).toBeUndefined()
            expect(await keyv.get('portfolio:v1:project:list:public')).toBe('D')
        })

        it('does nothing when no keys match the pattern', async () => {
            const keyv = await makeRealMemoryKeyv({
                'portfolio:v1:project:list:public': 'D',
            })

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    CacheInvalidationService,
                    { provide: CACHE_MANAGER, useValue: { del: jest.fn(), stores: [keyv] } },
                ],
            }).compile()
            const service = module.get<CacheInvalidationService>(CacheInvalidationService)

            await service.invalidateAllBlogs()

            expect(await keyv.get('portfolio:v1:project:list:public')).toBe('D')
        })
    })

    // ===========================================================================
    // deletePattern — Redis-shaped store (node-redis scanIterator convention)
    // ===========================================================================
    describe('deletePattern — Redis-shaped store', () => {
        it('uses scanIterator({MATCH, COUNT}) and unlink(), not ioredis-style scan()', async () => {
            const fake = makeFakeRedisKeyv([
                'portfolio:v1:blog:post-1',
                'portfolio:v1:blog:post-2',
                'portfolio:v1:project:list:public', // must not match
            ])

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    CacheInvalidationService,
                    { provide: CACHE_MANAGER, useValue: { del: jest.fn(), stores: [fake.keyv] } },
                ],
            }).compile()
            const service = module.get<CacheInvalidationService>(CacheInvalidationService)

            await service.invalidateAllBlogs()

            expect(fake.scanIterator).toHaveBeenCalledWith(
                expect.objectContaining({ MATCH: 'portfolio:v1:blog:*', COUNT: 100 }),
            )
            expect(fake.unlink).toHaveBeenCalledWith(['portfolio:v1:blog:post-1', 'portfolio:v1:blog:post-2'])
            expect(fake.del).not.toHaveBeenCalled() // unlink preferred over del
        })

        it('does not call unlink when nothing matches', async () => {
            const fake = makeFakeRedisKeyv(['portfolio:v1:project:list:public'])

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    CacheInvalidationService,
                    { provide: CACHE_MANAGER, useValue: { del: jest.fn(), stores: [fake.keyv] } },
                ],
            }).compile()
            const service = module.get<CacheInvalidationService>(CacheInvalidationService)

            await service.invalidateAllBlogs()

            expect(fake.unlink).not.toHaveBeenCalled()
        })
    })

    // ===========================================================================
    // deletePattern — multiple stores (Redis primary + in-memory fallback)
    // ===========================================================================
    describe('deletePattern — multiple configured stores', () => {
        it('clears matching keys from every store, not just the first', async () => {
            const fakeRedis = makeFakeRedisKeyv(['portfolio:v1:blog:post-1'])
            const memoryKeyv = await makeRealMemoryKeyv({
                'portfolio:v1:blog:post-1': 'cached copy in fallback tier',
            })

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    CacheInvalidationService,
                    {
                        provide: CACHE_MANAGER,
                        useValue: { del: jest.fn(), stores: [fakeRedis.keyv, memoryKeyv] },
                    },
                ],
            }).compile()
            const service = module.get<CacheInvalidationService>(CacheInvalidationService)

            await service.invalidateAllBlogs()

            expect(fakeRedis.unlink).toHaveBeenCalledWith(['portfolio:v1:blog:post-1'])
            expect(await memoryKeyv.get('portfolio:v1:blog:post-1')).toBeUndefined()
        })

        it('still clears the healthy store when the other one throws', async () => {
            const brokenKeyv = {
                store: {
                    client: {
                        scanIterator: jest.fn(() => {
                            throw new Error('Redis connection lost mid-scan')
                        }),
                    },
                },
            }
            const memoryKeyv = await makeRealMemoryKeyv({
                'portfolio:v1:blog:post-1': 'still here in memory',
            })

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    CacheInvalidationService,
                    {
                        provide: CACHE_MANAGER,
                        useValue: { del: jest.fn(), stores: [brokenKeyv, memoryKeyv] },
                    },
                ],
            }).compile()
            const service = module.get<CacheInvalidationService>(CacheInvalidationService)

            await expect(service.invalidateAllBlogs()).resolves.not.toThrow()
            expect(await memoryKeyv.get('portfolio:v1:blog:post-1')).toBeUndefined()
        })
    })

    // ===========================================================================
    // Graceful degradation
    // ===========================================================================
    describe('graceful degradation', () => {
        it('does not throw when a store exposes neither scanIterator nor keys()', async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    CacheInvalidationService,
                    {
                        provide: CACHE_MANAGER,
                        useValue: { del: jest.fn(), stores: [{ store: {} }] },
                    },
                ],
            }).compile()
            const service = module.get<CacheInvalidationService>(CacheInvalidationService)

            await expect(service.invalidateAllBlogs()).resolves.not.toThrow()
        })

        it('does not throw when cacheManager exposes no stores at all', async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    CacheInvalidationService,
                    { provide: CACHE_MANAGER, useValue: { del: jest.fn() } }, // no .stores
                ],
            }).compile()
            const service = module.get<CacheInvalidationService>(CacheInvalidationService)

            await expect(service.invalidateAllBlogs()).resolves.not.toThrow()
        })
    })

    // ===========================================================================
    // invalidatePattern — public advanced API
    // ===========================================================================
    describe('invalidatePattern()', () => {
        it('delegates to deletePattern with correct namespaced key', async () => {
            const keyv = await makeRealMemoryKeyv({ 'portfolio:v1:custom:1': 'x' })

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    CacheInvalidationService,
                    { provide: CACHE_MANAGER, useValue: { del: jest.fn(), stores: [keyv] } },
                ],
            }).compile()
            const service = module.get<CacheInvalidationService>(CacheInvalidationService)

            await service.invalidatePattern('custom:*')

            expect(await keyv.get('portfolio:v1:custom:1')).toBeUndefined()
        })
    })
})
