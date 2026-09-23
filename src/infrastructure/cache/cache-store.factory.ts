/**
 * @fileoverview buildCacheStores
 *
 * Builds the `stores` array for `CacheModule.registerAsync()`.
 *
 *   REDIS_URL set    → [redisKeyv (primary), memoryKeyv (fallback)]
 *   REDIS_URL unset  → [memoryKeyv] — identical to the app's previous
 *                       behavior, zero change for anyone not using Redis.
 *
 * Why this gives real fallback, not just a config toggle:
 * cache-manager v7's native multi-store `stores` array already checks
 * stores in priority order and does NOT let one store's failure block or
 * throw through get()/set() for the others — verified directly against
 * this installed version (7.2.8) with a deliberately-throwing store: both
 * get() and set() completed successfully against the surviving store.
 * That's the actual fallback mechanism; nothing here re-implements it.
 *
 * On the error listener below: it is NOT there to prevent a crash. Traced
 * the actual chain — KeyvRedis extends Hookified/Eventified, whose emit()
 * only throws on an unhandled 'error' event if throwOnEmitError or
 * throwOnEmptyListeners are explicitly set to true; both default false, and
 * neither keyv nor @keyv/redis override them. Confirmed live too: a Keyv
 * pointed at a genuinely unreachable Redis, zero listeners attached, ran
 * through a connection attempt and a full reconnect cycle (6s+) with no
 * crash — get()/set() just resolved to undefined/false. This library was
 * deliberately built to never take the process down on a connection error.
 * The listener exists purely for observability: without it, a Redis outage
 * degrades silently to memory-only with zero signal to notice, debug, or
 * alert on. Worth having, for that reason — not the reason a first pass at
 * this comment gave.
 *
 * On `asStoreAdapter` below: `keyv` and `@keyv/redis` resolve Keyv's type
 * through different TS module-resolution conditions, so TS treats their
 * Keyv instances as nominally distinct classes (private fields break
 * structural comparison) — see https://github.com/jaredwray/keyv/issues/1378.
 * Routing both through the plain `KeyvStoreAdapter` interface sidesteps
 * that. The interface itself can't be reached with a direct cast, though:
 * `keyv`'s own `Keyv.setMany()` returns `Promise<boolean[]>` while its
 * exported `KeyvStoreAdapter.setMany` is typed `Promise<void>` — an
 * inconsistency inside keyv's own declarations, harmless at runtime
 * (extra info where void is expected), but it means the cast has to go
 * through `unknown`.
 */

import { Logger } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { createKeyv } from '@keyv/redis'
import type { KeyvStoreAdapter } from 'keyv'

const logger = new Logger('CacheStoreFactory')

/**
 * Keyv instances satisfy KeyvStoreAdapter at runtime (that's their whole
 * purpose as cache-manager stores) but not provably to TS — see the
 * fileoverview comment. `unknown` is the deliberate, narrow escape hatch.
 */
function asStoreAdapter(store: object): KeyvStoreAdapter {
    return store as unknown as KeyvStoreAdapter
}

export async function buildCacheStores(configService: ConfigService) {
    const redisUrl = configService.get<string>('REDIS_URL')

    // Dynamic import intentionally used here.
    //
    // @nestjs/cache-manager resolves Keyv through the package's ESM
    // "import" condition. Using dynamic import() causes TypeScript to
    // resolve this Keyv declaration through the same condition, avoiding
    // the private "_ttl" type identity conflict for THIS Keyv instance.
    // (@keyv/redis's createKeyv() still resolves its own Keyv type through
    // a different path — that mismatch is what asStoreAdapter handles.)
    const { default: Keyv } = await import('keyv')

    const memoryKeyv = new Keyv()

    if (!redisUrl) {
        logger.log('REDIS_URL not set — using in-memory cache only')

        return {
            stores: [asStoreAdapter(memoryKeyv)],
        }
    }

    try {
        const redisKeyv = createKeyv(redisUrl, {
            connectionTimeout: 3000,
        })

        // Observability only. Redis failures should not bring down the app.
        redisKeyv.on('error', (error: Error) => {
            logger.warn(`Redis cache error — serving from in-memory fallback: ${error.message}`)
        })

        redisKeyv.on('connect', () => {
            logger.log('Redis cache connected')
        })

        logger.log('REDIS_URL set — Redis is primary cache, in-memory is fallback')

        // Redis remains PRIMARY.
        // Memory remains FALLBACK.
        return {
            stores: [asStoreAdapter(redisKeyv), asStoreAdapter(memoryKeyv)],
        }
    } catch (error) {
        logger.error(
            `Failed to construct Redis cache store — falling back to in-memory only: ${
                error instanceof Error ? error.message : String(error)
            }`,
        )

        return {
            stores: [asStoreAdapter(memoryKeyv)],
        }
    }
}
