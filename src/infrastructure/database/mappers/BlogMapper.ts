import { Blog as PrismaBlog, BlogTag as PrismaBlogTag } from '@prisma/client'
import { Blog } from '../../../domain/entities/Blog'
import { BlogTag } from '../../../domain/entities/BlogTag'

type PrismaBlogWithTags = PrismaBlog & { tags: PrismaBlogTag[] }

export class BlogMapper {
  static toDomain(raw: PrismaBlogWithTags): Blog {
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