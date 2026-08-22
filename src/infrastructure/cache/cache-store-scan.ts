/**
 * @fileoverview deleteKeysMatchingPattern
 *
 * Shared implementation behind CacheInvalidationService.deletePattern() and
 * CacheQueryService.deletePattern(). Extracted to one place deliberately:
 * before this fix, both files had their own copy of this logic, both wrong
 * in the same way (assumed cache-manager v5's `.store` shape, which doesn't
 * exist on the v7 actually installed here — see CacheInvalidationService.ts
 * for the full story). One correct implementation is harder to let drift
 * out of sync with reality than two.
 *
 * The types below exist specifically to keep `any` from leaking through
 * every line of this function — cache-manager's own types don't describe
 * `.stores[n].store` (an internal implementation detail we're deliberately
 * reaching into), so callers get a controlled, single cast at the boundary
 * instead of unsafe member access scattered through the whole function body.
 */

import type { Logger } from '@nestjs/common'

/** Minimal shape of the node-redis client @keyv/redis exposes via keyv.store.client. */
interface RedisScanClient {
    scanIterator(options: { MATCH: string; COUNT: number }): AsyncIterable<string>
    unlink?(keys: string[]): Promise<unknown>
    del(keys: string[]): Promise<unknown>
}

/** Minimal shape of the default in-memory Keyv store adapter. */
interface KeyEnumerableStore {
    keys(): Promise<Iterable<string> | AsyncIterable<string>>
    delete(key: string): Promise<unknown>
}

/** A single entry of cache-manager v7's `Cache.stores` array. */
interface KeyvLike {
    store?: {
        client?: RedisScanClient
        keys?: KeyEnumerableStore['keys']
        delete?: KeyEnumerableStore['delete']
    }
}

/** How many keys Redis returns per SCAN cursor iteration — see call sites for rationale. */
const SCAN_COUNT = 100

/**
 * Deletes every key matching `namespacedPattern` across all `stores`.
 * Returns the total number of keys deleted across every store.
 *
 * One store failing does not stop the others from being attempted — logged
 * via `logger`, never thrown, so a genuinely-down Redis still lets the
 * in-memory copy of the same data get cleared.
 */
export async function deleteKeysMatchingPattern(
    stores: unknown[],
    namespacedPattern: string,
    logger: Logger,
): Promise<number> {
    const prefix = namespacedPattern.replace(/\*+$/, '')
    let totalDeleted = 0

    for (const rawKeyv of stores) {
        const keyv = rawKeyv as KeyvLike
        try {
            totalDeleted += await deleteFromSingleStore(keyv, namespacedPattern, prefix, logger)
        } catch (error) {
            logger.error(
                `Pattern invalidation failed for one store (pattern base: ${prefix}*). ` +
                    `Other configured stores were still attempted.`,
                error instanceof Error ? error.stack : undefined,
            )
        }
    }

    return totalDeleted
}

async function deleteFromSingleStore(
    keyv: KeyvLike,
    namespacedPattern: string,
    prefix: string,
    logger: Logger,
): Promise<number> {
    const store = keyv.store
    const redisClient = store?.client

    if (redisClient && typeof redisClient.scanIterator === 'function') {
        return deleteViaRedisScan(redisClient, namespacedPattern)
    }

    if (store && typeof store.keys === 'function' && typeof store.delete === 'function') {
        return deleteViaInMemoryScan(store as Required<KeyEnumerableStore>, prefix)
    }

    // Neither Redis SCAN nor an in-memory keys() enumerator is available.
    // This is a misconfiguration — the cache store is unknown.
    logger.error(
        `Pattern invalidation FAILED for one store — it exposes neither SCAN nor keys(). ` +
            `Stale entries in that store will persist until TTL expiry or process restart.`,
    )
    return 0
}

// Redis path — node-redis's async-iterator SCAN, server-side MATCH.
// Non-blocking: yields in COUNT-sized batches instead of one O(N) call.
async function deleteViaRedisScan(client: RedisScanClient, namespacedPattern: string): Promise<number> {
    const keysToDelete: string[] = []
    for await (const key of client.scanIterator({ MATCH: namespacedPattern, COUNT: SCAN_COUNT })) {
        keysToDelete.push(key)
    }

    if (keysToDelete.length === 0) return 0

    // @keyv/redis defaults to UNLINK over DEL for performance; match that
    // preference here, falling back to DEL if a client build lacks it.
    if (typeof client.unlink === 'function') {
        await client.unlink(keysToDelete)
    } else {
        await client.del(keysToDelete)
    }

    return keysToDelete.length
}

// In-memory path — keys() returns EVERY key regardless of pattern (verified
// directly against the installed adapter), so filtering happens here. Raw
// keys carry the store's own internal namespace prefix (e.g. "keyv:") ahead
// of our app prefix — match by substring rather than assuming a fixed
// prefix, and delete via the raw store (not the outer Keyv wrapper, which
// would re-add a prefix the raw key already has).
async function deleteViaInMemoryScan(store: Required<KeyEnumerableStore>, prefix: string): Promise<number> {
    const allKeys: string[] = []
    for await (const key of await store.keys()) {
        allKeys.push(key)
    }

    const matched = allKeys.filter((key) => key.includes(prefix))
    if (matched.length === 0) return 0

    await Promise.all(matched.map((key) => store.delete(key)))
    return matched.length
}
