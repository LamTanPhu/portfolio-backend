import { Injectable } from '@nestjs/common'
import type { IBlogWriteRepository } from '../../../../domain/repositories/blog/IBlogWriteRepository'
import { Slug } from '../../../../domain/value-objects/Slug'
import type { BlogDTO } from '../../../dtos/BlogDTO'

interface Input {
    title: string
    content: string
    excerpt: string | null
    tags: string[]
    isPublished: boolean
    userId: number
}

@Injectable()
export class CreateBlogCommand {
    constructor(private readonly repo: IBlogWriteRepository) {}

    async execute(input: Input): Promise<BlogDTO> {
        const slug = Slug.from(input.title)
        const publishedAt = input.isPublished ? new Date() : null

        const blog = await this.repo.create({
        title: input.title,
        slug: slug.toString(),
        content: input.content,
        excerpt: input.excerpt,
        tags: input.tags,
        isPublished: input.isPublished,
        publishedAt,
        userId: input.userId,
        })

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
}