import { Inject, Injectable } from '@nestjs/common'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'
import type { BlogDTO } from '../../../dtos/BlogDTO'

// =============================================================================
// GetAllBlogsQuery
// Returns all blogs including drafts — admin only.
// content excluded — list views never need full post body.
// =============================================================================
@Injectable()
export class GetAllBlogsQuery {
    constructor(
        @Inject('IBlogReadRepository')
        private readonly repo: IBlogReadRepository,
    ) {}

    async execute(): Promise<BlogDTO[]> {
        const blogs = await this.repo.findAll()
        return blogs.map((b) => ({
        id:          b.id,
        title:       b.title,
        slug:        b.slug,
        content:     b.content,
        excerpt:     b.excerpt,
        tags:        b.tags.map((t) => t.name),
        isPublished: b.isPublished,
        publishedAt: b.publishedAt?.toISOString() ?? null,
        createdAt:   b.createdAt.toISOString(),
        }))
    }
}