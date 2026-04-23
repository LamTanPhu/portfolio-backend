import { Inject, Injectable } from '@nestjs/common'
import type { IBlogWriteRepository } from '../../../../domain/repositories/blog/IBlogWriteRepository'
import { Slug } from '../../../../domain/value-objects/Slug'
import type { BlogDTO } from '../../../dtos/BlogDTO'

// =============================================================================
// CreateBlogCommand Input
// =============================================================================
interface Input {
    title:       string
    content:     string
    excerpt:     string | null
    tags:        string[]
    isPublished: boolean
    userId:      number
}

// =============================================================================
// CreateBlogCommand
// Single responsibility: validate slug, persist blog, return DTO.
// slug auto-generated from title via Slug value object — never trusted from client.
// publishedAt set to now() when isPublished is true — never trusted from client.
// userId comes from verified JWT payload in controller — never trusted from client.
// =============================================================================
@Injectable()
export class CreateBlogCommand {
    constructor(
        @Inject('IBlogWriteRepository')
        private readonly repo: IBlogWriteRepository,
    ) {}

    async execute(input: Input): Promise<BlogDTO> {
        // Slug auto-generated — ValidationError thrown if title produces empty slug
        const slug = Slug.from(input.title)

        // publishedAt set server-side — never accept timestamps from client
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