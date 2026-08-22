import type { Blog } from '../../domain/entities/Blog'
import type { BlogSummary } from '../../domain/projections/BlogSummary'
import type { BlogDetailDTO } from '../dtos/blog/BlogDetailDTO'
import type { BlogSummaryDTO } from '../dtos/blog/BlogSummaryDTO'

// =============================================================================
// BlogMapper
// Centralized mapper from domain models / projections → application DTOs.
//
// Prevents mapping duplication across queries and commands.
// Keeps domain layer pure and application layer clean.
// =============================================================================
export class BlogMapper {
    // =========================================================================
    // Full aggregate → Detail DTO
    // =========================================================================
    static toDetailDTO(blog: Blog): BlogDetailDTO {
        return {
            id: blog.id,
            title: blog.title,
            slug: blog.slug,
            content: blog.content,
            excerpt: blog.excerpt,
            tags: blog.tags.map((t) => t.name),
            isPublished: blog.isPublished,
            publishedAt: blog.publishedAt?.toISOString() ?? null,
            createdAt: blog.createdAt.toISOString(),
        }
    }

    // =========================================================================
    // Summary projection → Summary DTO
    // =========================================================================
    static toSummaryDTO(summary: BlogSummary): BlogSummaryDTO {
        return {
            id: summary.id,
            title: summary.title,
            slug: summary.slug,
            excerpt: summary.excerpt,
            tags: summary.tags,
            isPublished: summary.isPublished,
            publishedAt: summary.publishedAt?.toISOString() ?? null,
            createdAt: summary.createdAt.toISOString(),
        }
    }

    static summaryListToDTO(summaries: BlogSummary[]): BlogSummaryDTO[] {
        return summaries.map(BlogMapper.toSummaryDTO)
    }
}
