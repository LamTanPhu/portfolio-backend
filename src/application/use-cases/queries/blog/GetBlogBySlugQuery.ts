import { Injectable, Inject } from '@nestjs/common'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'
import type { BlogDTO } from '../../../dtos/BlogDTO'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'

// =============================================================================
// GetBlogBySlugQuery
// Returns full blog post by slug — includes complete content.
// Slug is unique indexed — O(1) lookup guaranteed.
// Throws NotFoundError if slug does not exist — mapped to 404 by DomainExceptionFilter.
// =============================================================================
@Injectable()
export class GetBlogBySlugQuery {
    constructor(
        @Inject('IBlogReadRepository')
        private readonly repo: IBlogReadRepository,
    ) {}

    async execute(slug: string): Promise<BlogDTO> {
        const blog = await this.repo.findBySlug(slug)
        if (!blog) throw new NotFoundError(`Blog not found: ${slug}`)

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
    }
}