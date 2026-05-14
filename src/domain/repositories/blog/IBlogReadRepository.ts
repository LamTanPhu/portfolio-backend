// src/domain/repositories/blog/IBlogReadRepository.ts
import type { Blog } from '../../entities/Blog'
import type { BlogSummary } from '../../projections/BlogSummary'

// =============================================================================
// IBlogReadRepository
// Read interface for Blog aggregate.
// Separated from write — ISP enforced.
//
// findPublished and findAll return lightweight projections:
// - optimized for list rendering
// - excludes large content field
//
// findById and findBySlug return full Blog aggregate.
// =============================================================================
export interface IBlogReadRepository {
    findPublished(): Promise<BlogSummary[]>
    findAll(): Promise<BlogSummary[]>

    findById(id: number): Promise<Blog | null>
    findBySlug(slug: string): Promise<Blog | null>
}