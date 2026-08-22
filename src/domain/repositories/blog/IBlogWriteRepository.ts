import type { Blog } from '../../entities/Blog'

// =============================================================================
// CreateBlogInput
// slug auto-generated from title — never accepted from client.
// publishedAt set server-side when isPublished is true.
// userId from verified JWT payload — never accepted from client.
// =============================================================================
export interface CreateBlogInput {
    title: string
    slug: string
    content: string
    excerpt: string | null
    tags: string[]
    isPublished: boolean
    publishedAt: Date | null
    userId: number
}

// =============================================================================
// UpdateBlogInput
// All fields optional — PATCH semantics.
// tags replaced in full when provided — partial tag updates not supported.
//
// slug is intentionally ABSENT from this interface.
// Slugs are stable identifiers — regenerating on title change would silently
// break external links, SEO indexes, and CDN-cached routes. Callers that
// genuinely need to change a slug must do so via a dedicated operation with
// explicit uniqueness checking. No current use case requires this.
// =============================================================================
export interface UpdateBlogInput {
    title?: string
    content?: string
    excerpt?: string | null
    tags?: string[]
    isPublished?: boolean
    publishedAt?: Date | null
}

// =============================================================================
// IBlogWriteRepository
// Write interface for Blog aggregate — separated from read per ISP.
// delete cascades BlogTags automatically via onDelete: Cascade in schema.
// =============================================================================
export interface IBlogWriteRepository {
    create(data: CreateBlogInput): Promise<Blog>
    update(id: number, data: UpdateBlogInput): Promise<Blog>
    delete(id: number): Promise<void>
}
