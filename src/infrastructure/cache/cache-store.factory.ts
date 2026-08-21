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
 */

import { Logger } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { CreateCacheOptions } from 'cache-manager'
import { createKeyv } from '@keyv/redis'
import { Keyv } from 'keyv'

const logger = new Logger('CacheStoreFactory')

export function buildCacheStores(
    configService: ConfigService,
): Pick<CreateCacheOptions, 'stores'> {
    const redisUrl = configService.get<string>('REDIS_URL')
    const memoryKeyv = new Keyv() // same default in-memory adapter used before this change

    if (!redisUrl) {
        logger.log('REDIS_URL not set — using in-memory cache only')
        return { stores: [memoryKeyv] }
    }

    try {
        const redisKeyv = createKeyv(redisUrl, { connectionTimeout: 3000 })

        // Attached for observability, not crash-prevention — see file header
        // for why this library's emit() doesn't throw on an unhandled
        // 'error' event the way a raw Node EventEmitter would. Logged at
        // 'warn', not 'error': a Redis outage degrades this app to exactly
        // its previous (in-memory-only) behavior, it does not break it.
        // That's not error-severity.
        redisKeyv.on('error', (error: Error) => {
            logger.warn(`Redis cache error — serving from in-memory fallback: ${error.message}`)
        })

        redisKeyv.on('connect', () => {
            logger.log('Redis cache connected')
        })

        logger.log('REDIS_URL set — Redis is primary cache, in-memory is fallback')

        // Order matters: cache-manager checks stores in array order, so Redis
        // must come first to actually be the primary rather than a second tier
        // that's rarely consulted because in-memory already answered.
        return { stores: [redisKeyv, memoryKeyv] }
    } catch (error) {
        // Synchronous construction failure (e.g. malformed REDIS_URL). A typo
        // in an optional env var must never prevent the app from booting.
        logger.error(
            `Failed to construct Redis cache store — falling back to in-memory only: ${(error as Error).message}`,
        )
        return { stores: [memoryKeyv] }
    }
}
