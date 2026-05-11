import { Injectable, Inject } from '@nestjs/common'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'
import type { BlogDTO } from '../../../dtos/BlogDTO'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'

import { CACHE_TTL } from '../../../../infrastructure/cache/cache.constants'
import { CacheQueryService } from '../../../../infrastructure/cache/CacheQueryService'

// =============================================================================
// GetBlogBySlugQuery
// Returns full blog post by slug — includes complete content.
// Cached via CacheQueryService.
// =============================================================================
@Injectable()
export class GetBlogBySlugQuery {
    constructor(
        @Inject('IBlogReadRepository')
        private readonly repo: IBlogReadRepository,

        private readonly cacheQuery: CacheQueryService,
    ) {}

    async execute(slug: string): Promise<BlogDTO> {
        return this.cacheQuery.getOrSet(
            `blog:${slug}`,
            CACHE_TTL.LONG,
            async () => {
                const blog = await this.repo.findBySlug(slug)

                if (!blog) {
                    throw new NotFoundError(`Blog not found: ${slug}`)
                }

                return {
                    id:          blog.id,
                    title:       blog.title,
                    slug:        blog.slug,
                    content:     blog.content,
                    excerpt:     blog.excerpt,
                    tags:        blog.tags.map((t) => t.name),
                    isPublished: blog.isPublished,
                    publishedAt: blog.publishedAt?.toISOString() ?? null,
                    createdAt:   blog.createdAt.toISOString(),
                }
            },
        )
    }
}