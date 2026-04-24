import type { Blog } from '../../entities/Blog'

// =============================================================================
// IBlogReadRepository
// Read interface for Blog aggregate.
// Separated from write — ISP enforced, public API only ever reads.
// findAll returns all blogs — admin use only.
// findPublished returns summaries — content excluded at repository level.
// findById and findBySlug return full blog including content.
// =============================================================================
export interface IBlogReadRepository {
  findAll(): Promise<Blog[]>
  findPublished(): Promise<Blog[]>
  findById(id: number): Promise<Blog | null>
  findBySlug(slug: string): Promise<Blog | null>
}