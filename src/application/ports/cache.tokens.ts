/**
 * @fileoverview Cache Service Injection Tokens — Application Layer
 *
 * Defines DI tokens for cache ports. Lives in the application layer so
 * use cases can depend on these tokens without importing from infrastructure.
 *
 * Clean Architecture rule: application layer must never import from infrastructure.
 * Tokens are plain strings — no infrastructure dependency whatsoever.
 *
 * Infrastructure (CacheInfrastructureModule) imports these same tokens when
 * registering its concrete implementations, satisfying DIP from the other direction.
 */

export const CACHE_QUERY_SERVICE = 'ICacheQueryService'
export const CACHE_INVALIDATION_SERVICE = 'ICacheInvalidationService'
