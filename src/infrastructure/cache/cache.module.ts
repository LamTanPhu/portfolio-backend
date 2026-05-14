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

import type { ICacheQueryService } from '../../application/ports/ICacheQueryService'
import type { ICacheInvalidationService } from '../../application/ports/ICacheInvalidationService'

// Cache Service Tokens
export const CACHE_QUERY_SERVICE = 'ICacheQueryService'
export const CACHE_INVALIDATION_SERVICE = 'ICacheInvalidationService'

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