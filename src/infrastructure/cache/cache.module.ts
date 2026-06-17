/**
 * @fileoverview CacheInfrastructureModule
 * 
 * Global module that provides caching services to the entire application.
 * 
 * This module follows Clean Architecture by:
 * - Keeping concrete implementations in the Infrastructure layer
 * - Exposing abstractions (ports) for the Application layer
 */
import { Global, Module } from '@nestjs/common'

import { CacheQueryService } from './CacheQueryService'
import { CacheInvalidationService } from './CacheInvalidationService'

// import type { ICacheQueryService } from '../../application/ports/ICacheQueryService'
// import type { ICacheInvalidationService } from '../../application/ports/ICacheInvalidationService'
import { CACHE_INVALIDATION_SERVICE, CACHE_QUERY_SERVICE } from '../../application/ports/cache.tokens'

// Re-export tokens from application ports — single source of truth.
// Infrastructure modules may import from here for convenience, but the
// canonical definition lives in application/ports/cache.tokens.ts.
export { CACHE_QUERY_SERVICE, CACHE_INVALIDATION_SERVICE } from '../../application/ports/cache.tokens'

@Global()
@Module({
    providers: [
        CacheQueryService,
        CacheInvalidationService,

        { provide: CACHE_QUERY_SERVICE, useExisting: CacheQueryService },
        { provide: CACHE_INVALIDATION_SERVICE, useExisting: CacheInvalidationService },
    ],

    exports: [
        CACHE_QUERY_SERVICE,
        CACHE_INVALIDATION_SERVICE,
        CacheQueryService,
        CacheInvalidationService,
    ],
})
export class CacheInfrastructureModule {}