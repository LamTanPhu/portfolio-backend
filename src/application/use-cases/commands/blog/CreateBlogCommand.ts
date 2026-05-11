import { Injectable, Inject } from '@nestjs/common'
import type { IBlogWriteRepository } from '../../../../domain/repositories/blog/IBlogWriteRepository'
import { Slug } from '../../../../domain/value-objects/Slug'
import type { BlogDTO } from '../../../dtos/BlogDTO'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'

// =============================================================================
// CreateBlogCommand
// Creates a new blog post, returns DTO, and invalidates public blog cache.
// =============================================================================
@Injectable()
export class CreateBlogCommand {
    constructor(
        @Inject('IBlogWriteRepository')
        private readonly repo: IBlogWriteRepository,

        @Inject('ICacheInvalidationService')
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(input: {
        title:       string
        content:     string
        excerpt:     string | null
        tags:        string[]
        isPublished: boolean
        userId:      number
    }): Promise<BlogDTO> {
        const slug = Slug.from(input.title)
        const publishedAt = input.isPublished ? new Date() : null

        const blog = await this.repo.create({
            title:       input.title,
            slug:        slug.toString(),
            content:     input.content,
            excerpt:     input.excerpt,
            tags:        input.tags,
            isPublished: input.isPublished,
            publishedAt,
            userId:      input.userId,
        })

        // Invalidate cache so frontend immediately sees the new blog
        await this.cacheService.invalidatePublicBlogs()

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