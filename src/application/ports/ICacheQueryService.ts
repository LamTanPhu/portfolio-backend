/**
 * @fileoverview ICacheQueryService - Application Port for Cache Operations
 *
 * This port defines the contract for cache read operations following the
 * Dependency Inversion Principle. Application services should depend on
 * this abstraction rather than concrete cache implementations.
 */

/**
 * Cache TTL profile names — mirrors CACHE_TTL keys in infrastructure.
 * Defined here so the application layer owns this type without importing
 * from infrastructure (Clean Architecture dependency rule).
 */
export type CacheProfile = 'REALTIME' | 'SHORT' | 'MEDIUM' | 'LONG' | 'VERY_LONG' | 'STATIC'

/**
 * Options for cache getOrSet operations.
 */
export interface GetOrSetOptions {
    /** Additional time (seconds) data can be served as stale */
    staleTtl?: number
    /** Force refresh even if cache is still fresh */
    forceRefresh?: boolean
    /** Number of retry attempts if factory fails */
    retries?: number
}

/**
 * Centralized cache query service port.
 * Supports Stale-While-Revalidate pattern for optimal performance.
 */
export interface ICacheQueryService {
    /**
     * Gets data from cache or executes factory and stores result.
     * @param key - Cache key (will be namespaced internally)
     * @param ttl - Fresh duration in seconds
     * @param factory - Function to fetch fresh data on miss/expiration
     * @param options - Advanced caching options
     */
    getOrSet<T>(
        key: string,
        ttl: number,
        factory: () => Promise<T>,
        options?: GetOrSetOptions,
    ): Promise<T>

    /**
     * Convenience method using predefined cache profiles.
     */
    getOrSetWithProfile<T>(
        key: string,
        profile: CacheProfile,
        factory: () => Promise<T>,
    ): Promise<T>

    delete(key: string): Promise<void>
    deletePattern(pattern: string): Promise<void>
    clear(): Promise<void>
}