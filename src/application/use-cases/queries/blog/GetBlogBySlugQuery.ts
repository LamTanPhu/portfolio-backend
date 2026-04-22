import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'
import type { BlogDTO } from '../../../dtos/BlogDTO'

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