/**
 * @fileoverview buildCacheStores Unit Tests
 *
 * Covers the three real branches:
 *  - REDIS_URL unset            → single in-memory store, identical to before
 *  - REDIS_URL set, valid       → [redisKeyv, memoryKeyv], error listener attached
 *  - REDIS_URL set, constructor throws (malformed URL) → falls back to
 *    in-memory only, never lets a bad env var block app boot
 */

import type { ConfigService } from '@nestjs/config'
import { buildCacheStores } from './cache-store.factory'

/** Minimal shape needed to inspect a Keyv instance's backing store in tests. */
interface InspectableKeyv {
    store?: { client?: unknown }
    listeners(event: string): unknown[]
}

function makeConfigService(redisUrl: string | undefined): ConfigService {
    return { get: jest.fn().mockReturnValue(redisUrl) } as unknown as ConfigService
}

function hasRedisClient(keyv: unknown): boolean {
    return (keyv as InspectableKeyv).store?.client !== undefined
}

describe('buildCacheStores', () => {
    it('returns a single in-memory store when REDIS_URL is not set', () => {
        const result = buildCacheStores(makeConfigService(undefined))

        expect(result.stores).toHaveLength(1)
    })

    it('returns Redis first, memory second when REDIS_URL is set to a well-formed URL', () => {
        const result = buildCacheStores(makeConfigService('redis://user:pass@localhost:6379'))

        expect(result.stores).toHaveLength(2)
        // Redis-backed Keyv exposes a client with scanIterator; the plain
        // in-memory adapter does not — a reliable way to check ordering
        // without depending on internal class names.
        const [primary, fallback] = result.stores!
        expect(hasRedisClient(primary)).toBe(true)
        expect(hasRedisClient(fallback)).toBe(false)
    })

    it('attaches an error listener to the Redis Keyv instance (for observability)', () => {
        const result = buildCacheStores(makeConfigService('redis://user:pass@localhost:6379'))
        const [redisKeyv] = result.stores!

        // Not required to prevent a crash — verified separately that this
        // library's emit() only throws on an unhandled 'error' event if
        // throwOnEmitError/throwOnEmptyListeners are explicitly enabled, and
        // neither keyv nor @keyv/redis do that (both default false). This
        // listener exists so a Redis outage is visible in logs instead of
        // silently degrading to memory-only with zero signal to notice it.
        expect((redisKeyv as InspectableKeyv).listeners('error').length).toBeGreaterThan(0)
    })

    it('falls back to in-memory only when REDIS_URL is malformed', () => {
        // A URL missing the redis:// scheme is rejected synchronously by the
        // client constructor — this must not prevent the app from booting.
        const result = buildCacheStores(makeConfigService('not-a-valid-url'))

        expect(result.stores).toHaveLength(1)
        expect(hasRedisClient(result.stores![0])).toBe(false)
    })
})
