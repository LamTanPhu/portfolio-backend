/**
 * @fileoverview CacheInvalidationService
 *
 * Centralized cache invalidation service for the portfolio backend.
 *
 * Responsibilities:
 * - Single source of truth for cache key management
 * - Consistent namespacing to prevent collisions
 * - Safe pattern-based invalidation with graceful degradation
 * - Comprehensive logging for observability
 *
 * Current store: in-memory Keyv (cache-manager built-in).
 * deletePattern() uses the store's keys() method for pattern matching.
 *
 * If Redis is ever restored, deletePattern() will automatically prefer the
 * Redis SCAN path (non-blocking, cursor-based) over KEYS (blocking O(N) scan).
 * The fallback branches below handle both cases without changes.
 */

import { Injectable, Inject, Logger } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { Cache } from 'cache-manager'

import type { ICacheInvalidationService } from '../../application/ports/ICacheInvalidationService'

// How many keys Redis returns per SCAN cursor iteration.
// 100 is a safe default — large enough to be efficient, small enough not to
// block the event loop on any single iteration.
const SCAN_COUNT = 100

@Injectable()
export class CacheInvalidationService implements ICacheInvalidationService {
    private readonly logger = new Logger(CacheInvalidationService.name)

    /** Global cache key prefix to isolate this application's cache entries */
    private readonly CACHE_PREFIX = 'portfolio:v1:'

    constructor(
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache,
    ) {}

    // ===================================================================
    // PRIVATE HELPERS
    // ===================================================================

    /**
     * Applies namespace prefix to cache keys for isolation and clarity.
     */
    private getNamespacedKey(key: string): string {
        return this.CACHE_PREFIX + key
    }

    /**
     * Safely deletes a single key with error handling.
     */
    private async delete(key: string): Promise<void> {
        try {
            const namespacedKey = this.getNamespacedKey(key)
            await this.cacheManager.del(namespacedKey)
        } catch (error) {
            this.logger.error(`Failed to delete cache key: ${key}`, error)
        }
    }

    /**
     * Deletes all keys matching a glob pattern using Redis SCAN.
     *
     * Why SCAN instead of KEYS:
     *   KEYS '*pattern*' is a single O(N) blocking call that halts the Redis
     *   event loop until it completes. SCAN iterates in cursor-based batches
     *   of ~SCAN_COUNT keys, yielding control between each batch so other
     *   Redis commands are never starved.
     *
     * Falls back gracefully if the underlying store does not expose a Redis
     * client (e.g. in-memory cache during tests).
     */
    private async deletePattern(pattern: string): Promise<void> {
        const namespacedPattern = this.getNamespacedKey(pattern)

        try {
            const store = (this.cacheManager as any).store

            // Prefer SCAN via the raw ioredis client
            const redisClient = store?.client ?? store?.getClient?.()

            if (redisClient?.scan) {
                let cursor = '0'
                let totalDeleted = 0

                do {
                    // SCAN returns [nextCursor, matchedKeys]
                    const [nextCursor, keys]: [string, string[]] = await redisClient.scan(
                        cursor,
                        'MATCH', namespacedPattern,
                        'COUNT', SCAN_COUNT,
                    )

                    cursor = nextCursor

                    if (keys.length > 0) {
                        // DEL accepts multiple keys in one call — one round-trip per batch
                        await redisClient.del(...keys)
                        totalDeleted += keys.length
                    }
                } while (cursor !== '0')

                if (totalDeleted > 0) {
                    this.logger.log(
                        `SCAN invalidated ${totalDeleted} keys with pattern: ${pattern}`,
                    )
                }

            } else if (store?.keys) {
                // Fallback: in-memory store (e.g. cache-manager MemoryStore in tests)
                // does not have a Redis client — use its own keys() method instead.
                const keys: string[] = await store.keys(namespacedPattern)
                if (keys.length > 0) {
                    await Promise.all(keys.map((key: string) => this.cacheManager.del(key)))
                    this.logger.log(
                        `[fallback] Invalidated ${keys.length} keys with pattern: ${pattern}`,
                    )
                }

            } else {
                this.logger.warn(
                    `Pattern invalidation skipped — store exposes neither SCAN nor keys(): ${pattern}`,
                )
            }

        } catch (error) {
            this.logger.warn(`Pattern invalidation partially failed for: ${pattern}`, error)
        }
    }

    // ===================================================================
    // PUBLIC INVALIDATION METHODS
    // ===================================================================

    // --------------------- Blog ---------------------
    async invalidatePublicBlogs(): Promise<void> {
        await this.delete('blog:list:public')
    }

    async invalidateBlogBySlug(slug: string): Promise<void> {
        await this.delete(`blog:${slug}`)
    }

    async invalidateAllBlogs(): Promise<void> {
        await this.deletePattern('blog:*')
    }

    // --------------------- Project ---------------------
    async invalidatePublicProjects(): Promise<void> {
        await this.delete('project:list:public')
    }

    async invalidateProjectBySlug(slug: string): Promise<void> {
        await this.delete(`project:${slug}`)
    }

    async invalidateAllProjects(): Promise<void> {
        await this.deletePattern('project:*')
    }

    // --------------------- Skill ---------------------
    async invalidatePublicSkills(): Promise<void> {
        await this.delete('skill:list:public')
    }

    // --------------------- Certification ---------------------
    async invalidatePublicCertifications(): Promise<void> {
        await this.delete('certification:list:public')
    }

    // --------------------- Education ---------------------
    async invalidatePublicEducation(): Promise<void> {
        await this.delete('education:list:public')
    }

    // --------------------- Job ---------------------
    async invalidatePublicJobs(): Promise<void> {
        await this.delete('job:list:public')
    }

    // --------------------- Social ---------------------
    async invalidatePublicSocialAccounts(): Promise<void> {
        await this.delete('social:list:public')
    }

    // --------------------- Contact (Admin) ---------------------
    /**
     * Clears the admin contact message list cache.
     * Must be called after any write to the ContactMe table (delete).
     * Key matches CONTACT_LIST_CACHE_KEY in GetContactMessagesQuery.
     */
    async invalidateContactList(): Promise<void> {
        await this.delete('contact:list:admin')
    }

    // --------------------- Advanced ---------------------
    /**
     * Invalidates cache entries by pattern.
     * Useful for bulk invalidation (e.g., after bulk updates).
     */
    async invalidatePattern(pattern: string): Promise<void> {
        await this.deletePattern(pattern)
    }
}