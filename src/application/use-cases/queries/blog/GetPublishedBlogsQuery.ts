import { Injectable, Inject } from '@nestjs/common'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'
import type { BlogDTO } from '../../../dtos/BlogDTO'
import { CacheTTL } from '@nestjs/cache-manager/dist/decorators/cache-ttl.decorator'
import { CacheKey } from '@nestjs/cache-manager/dist/decorators/cache-key.decorator'

// =============================================================================
// GetPublishedBlogsQuery
// Returns summaries of all published blogs — content is empty string.
// content excluded at repository level — list views never render full post body.
// O(n) — filtered by isPublished index, ordered by publishedAt desc.
// =============================================================================
@Injectable()
export class GetPublishedBlogsQuery {
  constructor(
    @Inject('IBlogReadRepository')
    private readonly repo: IBlogReadRepository,
  ) {}

  @CacheKey('public_blogs')
  @CacheTTL(300_000)
  async execute(): Promise<BlogDTO[]> {
    const blogs = await this.repo.findPublished()
    return blogs.map((b) => ({
      id:          b.id,
      title:       b.title,
      slug:        b.slug,
      content:     b.content,  // empty string on list queries — see PrismaBlogRepository
      excerpt:     b.excerpt,
      tags:        b.tags.map((t) => t.name),
      isPublished: b.isPublished,
      publishedAt: b.publishedAt?.toISOString() ?? null,
      createdAt:   b.createdAt.toISOString(),
    }))
  }
}