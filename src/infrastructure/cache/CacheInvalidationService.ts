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
 * Store shape (cache-manager v7 — verified directly against the installed
 * version, not assumed from older docs):
 *   The injected Cache has `.stores: Keyv[]`, NOT the `.store` (singular)
 *   property older cache-manager versions exposed. Each Keyv's `.store`
 *   is either the default in-memory adapter or, when REDIS_URL is set
 *   (see cache-store.factory.ts), a `@keyv/redis` KeyvRedis instance.
 *   With Redis primary + memory fallback both active, a normal set()
 *   writes to both, so invalidation must clear both or a stale value can
 *   resurface from the fallback tier during a brief Redis hiccup right
 *   after a write. The per-store enumeration and deletion logic (Redis
 *   SCAN vs in-memory key filtering) lives in cache-store-scan.ts — see
 *   that file for the node-redis calling convention details and the
 *   reasoning behind each store's deletion strategy.
 */

import { Injectable, Inject, Logger } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { Cache } from 'cache-manager'

import type { ICacheInvalidationService } from '../../application/ports/ICacheInvalidationService'
import { deleteKeysMatchingPattern } from './cache-store-scan'

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
     * Deletes all keys matching a glob pattern, across every configured
     * cache store (in-memory only, or Redis + in-memory when REDIS_URL is
     * set — see cache-store.factory.ts).
     *
     * Delegates the actual store traversal to deleteKeysMatchingPattern —
     * see cache-store-scan.ts for the per-store enumeration strategy and
     * why this needed fixing in the first place (cache-manager v5 vs v7
     * shape mismatch).
     */
    private async deletePattern(pattern: string): Promise<void> {
        const namespacedPattern = this.getNamespacedKey(pattern)
        const stores = (this.cacheManager as unknown as { stores?: unknown[] }).stores ?? []

        if (stores.length === 0) {
            this.logger.error(
                `Pattern invalidation FAILED — cache manager exposes no stores. ` +
                `Stale cache entries will persist until TTL expiry or process restart. ` +
                `Pattern: ${pattern}`,
            )
            return
        }

        const totalDeleted = await deleteKeysMatchingPattern(stores, namespacedPattern, this.logger)

        if (totalDeleted > 0) {
            this.logger.log(`Invalidated ${totalDeleted} keys with pattern: ${pattern}`)
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

    // --------------------- User ---------------------
    /**
     * Clears the cached user profile for a specific user.
     * Key matches the pattern used in GetUserProfileQuery.
     */
    async invalidateUserProfile(userId: number): Promise<void> {
        await this.delete(`user:profile:${userId}`)
    }

    // --------------------- Contact (Admin) ---------------------
    /**
     * Clears all cached admin contact message list pages.
     * Must be called after any write to the ContactMe table (delete).
     *
     * BUG FIX: this used to delete() the literal key 'contact:list:admin'.
     * GetContactMessagesQuery actually caches under
     * `contact:list:admin:cursor=<cursor>:limit=<limit>` (see
     * contactListCacheKey in GetContactMessagesQuery.ts) — a different key
     * per page. The exact-key delete never matched any real cached entry, so
     * deleting a contact message never actually invalidated the admin list;
     * it just silently no-op'd until the TTL expired. Pattern deletion
     * catches every paginated variant.
     */
    async invalidateContactList(): Promise<void> {
        await this.deletePattern('contact:list:admin:*')
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