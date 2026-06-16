/**
 * @fileoverview ICacheInvalidationService - Application Port
 * 
 * Defines the contract for cache invalidation operations.
 * Follows Dependency Inversion Principle: Application use cases depend
 * on this abstraction, not on concrete cache implementations.
 */

export interface ICacheInvalidationService {
    // Blog
    invalidatePublicBlogs(): Promise<void>
    invalidateBlogBySlug(slug: string): Promise<void>
    invalidateAllBlogs(): Promise<void>

    // Project
    invalidatePublicProjects(): Promise<void>
    invalidateProjectBySlug(slug: string): Promise<void>
    invalidateAllProjects(): Promise<void>

    // Skill
    invalidatePublicSkills(): Promise<void>

    // Others
    invalidatePublicCertifications(): Promise<void>
    invalidatePublicEducation(): Promise<void>
    invalidatePublicJobs(): Promise<void>
    invalidatePublicSocialAccounts(): Promise<void>

    // Contact (admin)
    /** Clears the cached admin contact message list — call after any write to ContactMe */
    invalidateContactList(): Promise<void>

    // Advanced
    invalidatePattern(pattern: string): Promise<void>
}