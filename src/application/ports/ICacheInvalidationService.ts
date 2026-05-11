// =============================================================================
// ICacheInvalidationService
// Application Layer Port — Defines cache invalidation contracts for use cases.
// Commands depend on this abstraction (Dependency Inversion).
// =============================================================================
export interface ICacheInvalidationService {
    invalidatePublicBlogs(): Promise<void>
    invalidateBlogBySlug(slug: string): Promise<void>

    invalidatePublicProjects(): Promise<void>
    invalidateProjectBySlug(slug: string): Promise<void>

    invalidatePublicSkills(): Promise<void>
    invalidatePublicCertifications(): Promise<void>
    invalidatePublicEducation(): Promise<void>
    invalidatePublicJobs(): Promise<void>
    invalidatePublicSocialAccounts(): Promise<void>
}