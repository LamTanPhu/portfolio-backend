import type { Blog as PrismaBlog, BlogTag as PrismaBlogTag } from '@prisma/client'
import { Blog } from '../../../domain/entities/Blog'
import { BlogTag } from '../../../domain/entities/BlogTag'

// =============================================================================
// BlogWithTags
// Prisma result type including tags relation.
// Defined here — used exclusively by PrismaBlogMapper, not exposed elsewhere.
// =============================================================================
type BlogWithTags = PrismaBlog & { tags: PrismaBlogTag[] }

// =============================================================================
// PrismaBlogMapper
// Converts Prisma Blog model → domain Blog entity.
//
// Static methods — no state, no dependencies, fully testable.
// Tags mapped inline — BlogTag is owned by Blog aggregate.
// =============================================================================
export class PrismaBlogMapper {
    static toDomain(raw: BlogWithTags): Blog {
        const tags = raw.tags.map((t) => new BlogTag(t.id, t.name, t.blogId))

        return new Blog(
            raw.id,
            raw.title,
            raw.slug,
            raw.content,
            raw.excerpt,
            tags,
            raw.isPublished,
            raw.publishedAt,
            raw.userId,
            raw.createdAt,
            raw.updatedAt,
        )
    }
}
