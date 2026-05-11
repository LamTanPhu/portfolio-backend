import { Injectable, Inject } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { Cache } from 'cache-manager'

// =============================================================================
// CacheQueryService
// Centralized reusable query caching helper.
// Keeps cache orchestration out of application query handlers.
// =============================================================================
@Injectable()
export class CacheQueryService {
    constructor(
        @Inject(CACHE_MANAGER)
        private readonly cache: Cache,
    ) {}

    async getOrSet<T>(
        key: string,
        ttl: number,
        factory: () => Promise<T>,
    ): Promise<T> {
        const cached = await this.cache.get<T>(key)

        // Important:
        // Avoid falsy checks because valid cached values may be:
        // false, 0, '', or empty arrays.
        if (cached !== null && cached !== undefined) {
            return cached
        }

        const result = await factory()

        await this.cache.set(key, result, ttl)

        return result
    }
}