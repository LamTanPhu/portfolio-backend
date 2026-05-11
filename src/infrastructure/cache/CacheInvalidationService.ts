import { Injectable, Inject } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'

import type { Cache } from 'cache-manager'

import type { ICacheInvalidationService } from '../../application/ports/ICacheInvalidationService'

// =============================================================================
// CacheInvalidationService
// Centralized Redis cache invalidation service.
// Uses namespaced Redis-style cache keys.
// =============================================================================
@Injectable()
export class CacheInvalidationService implements ICacheInvalidationService {
    constructor(
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache,
    ) {}

    // =========================================================================
    // Internal Helpers
    // =========================================================================

    private async invalidate(key: string): Promise<void> {
        await this.cacheManager.del(key)
    }

    // =========================================================================
    // Blog
    // =========================================================================

    async invalidatePublicBlogs(): Promise<void> {
        await this.invalidate('blog:list:public')
    }

    async invalidateBlogBySlug(slug: string): Promise<void> {
        await this.invalidate(`blog:${slug}`)
    }

    // =========================================================================
    // Project
    // =========================================================================

    async invalidatePublicProjects(): Promise<void> {
        await this.invalidate('project:list:public')
    }

    async invalidateProjectBySlug(slug: string): Promise<void> {
        await this.invalidate(`project:${slug}`)
    }

    // =========================================================================
    // Skill
    // =========================================================================

    async invalidatePublicSkills(): Promise<void> {
        await this.invalidate('skill:list:public')
    }

    // =========================================================================
    // Certification
    // =========================================================================

    async invalidatePublicCertifications(): Promise<void> {
        await this.invalidate('certification:list:public')
    }

    // =========================================================================
    // Education
    // =========================================================================

    async invalidatePublicEducation(): Promise<void> {
        await this.invalidate('education:list:public')
    }

    // =========================================================================
    // Job
    // =========================================================================

    async invalidatePublicJobs(): Promise<void> {
        await this.invalidate('job:list:public')
    }

    // =========================================================================
    // Social
    // =========================================================================

    async invalidatePublicSocialAccounts(): Promise<void> {
        await this.invalidate('social:list:public')
    }
}