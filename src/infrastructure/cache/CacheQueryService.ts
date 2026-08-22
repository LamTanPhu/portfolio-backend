/**
 * @fileoverview CacheQueryService - Production-grade caching service
 *
 * Implements Stale-While-Revalidate pattern with background refresh,
 * deduplication, retry logic, and memory safety.
 *
 * Key Features:
 * - Namespaced keys to prevent collisions
 * - Memory leak protection on background refreshes
 * - Configurable fresh/stale windows
 * - Graceful degradation for non-Redis stores
 */

import { Injectable, Inject, Logger } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { Cache } from 'cache-manager'

import type { ICacheQueryService, GetOrSetOptions } from '../../application/ports/ICacheQueryService'
import { CACHE_TTL } from './cache.constants'
import type { CacheProfile } from '../../application/ports/ICacheQueryService'
import { deleteKeysMatchingPattern } from './cache-store-scan'

interface CacheEnvelope<T> {
    data: T
    expiresAt: number // Timestamp when data becomes stale
    staleUntil: number // Timestamp when data is considered expired
}

@Injectable()
export class CacheQueryService implements ICacheQueryService {
    private readonly logger = new Logger(CacheQueryService.name)

    /** In-memory map to deduplicate simultaneous background refreshes */
    private readonly refreshing = new Map<string, Promise<any>>()

    /** Global cache key prefix for this application */
    private readonly CACHE_PREFIX = 'portfolio:v1:'

    constructor(
        @Inject(CACHE_MANAGER)
        private readonly cache: Cache,
    ) {}

    /**
     * Adds namespace prefix to prevent key collisions across services/environments.
     */
    private getNamespacedKey(key: string): string {
        return this.CACHE_PREFIX + key
    }

    // ===================================================================
    // PUBLIC API
    // ===================================================================

    async getOrSet<T>(key: string, ttl: number, factory: () => Promise<T>, options: GetOrSetOptions = {}): Promise<T> {
        const namespacedKey = this.getNamespacedKey(key)
        const now = Date.now()
        const staleTtl = options.staleTtl ?? ttl
        const forceRefresh = options.forceRefresh ?? false

        if (forceRefresh) {
            return this.refreshAndStore(namespacedKey, ttl, staleTtl, factory, options.retries)
        }

        const cached = await this.cache.get<CacheEnvelope<T>>(namespacedKey)

        if (cached) {
            // Fresh cache hit - fastest path
            if (now < cached.expiresAt) {
                return cached.data
            }

            // Stale-While-Revalidate: serve stale data + refresh in background
            if (now < cached.staleUntil) {
                void this.refreshInBackground(namespacedKey, ttl, staleTtl, factory)
                return cached.data
            }
        }

        // Cache miss or fully expired
        return this.refreshAndStore(namespacedKey, ttl, staleTtl, factory, options.retries)
    }

    async getOrSetWithProfile<T>(key: string, profile: CacheProfile, factory: () => Promise<T>): Promise<T> {
        const config = CACHE_TTL[profile]
        return this.getOrSet(key, config.fresh, factory, { staleTtl: config.stale })
    }

    // ===================================================================
    // CORE REFRESH LOGIC
    // ===================================================================

    private async refreshAndStore<T>(
        key: string,
        ttl: number,
        staleTtl: number,
        factory: () => Promise<T>,
        retries = 2,
    ): Promise<T> {
        const data = await this.executeWithRetry(factory, retries)

        const now = Date.now()
        const envelope: CacheEnvelope<T> = {
            data,
            expiresAt: now + ttl * 1000,
            staleUntil: now + (ttl + staleTtl) * 1000,
        }

        // Physical TTL includes stale window + safety buffer
        await this.cache.set(key, envelope, ttl + staleTtl + 180)
        return data
    }

    /**
     * Background refresh with guaranteed cleanup to prevent memory leaks.
     */
    private async refreshInBackground<T>(
        key: string,
        ttl: number,
        staleTtl: number,
        factory: () => Promise<T>,
    ): Promise<void> {
        if (this.refreshing.has(key)) return

        const promise = (async () => {
            try {
                await this.refreshAndStore(key, ttl, staleTtl, factory)
            } catch (error) {
                this.logger.error(`Background cache refresh failed for key: ${key}`, error)
            } finally {
                this.refreshing.delete(key) // ← Critical: Prevents memory leak
            }
        })()

        this.refreshing.set(key, promise)
    }

    // ===================================================================
    // DELETION METHODS
    // ===================================================================

    async delete(key: string): Promise<void> {
        const namespacedKey = this.getNamespacedKey(key)
        await this.cache.del(namespacedKey)
    }

    async deletePattern(pattern: string): Promise<void> {
        const namespacedPattern = this.getNamespacedKey(pattern)

        try {
            const stores = (this.cache as unknown as { stores?: unknown[] }).stores ?? []
            const totalDeleted = await deleteKeysMatchingPattern(stores, namespacedPattern, this.logger)

            // No configured store could enumerate keys at all (not just "zero
            // matched") — last-resort attempt at an exact-match delete, in case
            // the caller actually passed a literal key rather than a pattern.
            if (totalDeleted === 0 && stores.length === 0) {
                await this.delete(pattern)
            }
        } catch (error) {
            this.logger.warn(`Pattern deletion failed for ${pattern}`, error)
            await this.delete(pattern)
        }
    }

    async clear(): Promise<void> {
        await this.cache.clear?.()
        this.logger.warn('Cache cleared entirely')
    }

    // ===================================================================
    // UTILITIES
    // ===================================================================

    private async executeWithRetry<T>(fn: () => Promise<T>, retries: number, baseDelay = 300): Promise<T> {
        let lastError: unknown

        for (let attempt = 1; attempt <= retries + 1; attempt++) {
            try {
                return await fn()
            } catch (error) {
                lastError = error
                if (attempt > retries) break

                const delay = baseDelay * attempt
                await new Promise((resolve) => setTimeout(resolve, delay))
            }
        }

        throw lastError
    }
}
