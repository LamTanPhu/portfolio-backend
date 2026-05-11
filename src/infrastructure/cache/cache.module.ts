import { Global, Module } from '@nestjs/common'

import { CacheInvalidationService } from './CacheInvalidationService'
import { CacheQueryService } from './CacheQueryService'

// =============================================================================
// CacheInfrastructureModule
// Centralized cache infrastructure services.
// Exported globally for all feature modules.
// =============================================================================
@Global()
@Module({
    providers: [
        // Concrete services
        CacheQueryService,
        CacheInvalidationService,

        // Interface token mappings
        {
            provide: 'ICacheInvalidationService',
            useExisting: CacheInvalidationService,
        },
    ],

    exports: [
        CacheQueryService,
        CacheInvalidationService,

        // Export token mapping too
        'ICacheInvalidationService',
    ],
})
export class CacheInfrastructureModule {}