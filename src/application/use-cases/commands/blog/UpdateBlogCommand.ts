import { Inject, Injectable } from '@nestjs/common'
import type {
    IBlogWriteRepository,
    UpdateBlogInput,
} from '../../../../domain/repositories/blog/IBlogWriteRepository'
import type { BlogDTO } from '../../../dtos/BlogDTO'

interface Input extends UpdateBlogInput {
    id: number
}

// =============================================================================
// UpdateBlogCommand
// NotFoundError thrown by repository if id does not exist — no pre-check needed.
// O(1) — single DB query, no read-before-write.
// publishedAt set server-side when isPublished changes to true.
// =============================================================================
@Injectable()
export class UpdateBlogCommand {
    constructor(
        @Inject('IBlogWriteRepository')
        private readonly repo: IBlogWriteRepository,
    ) {}

    async execute(input: Input): Promise<BlogDTO> {
        const { id, ...data } = input

        // Set publishedAt server-side when publishing — never trust client timestamp
        if (data.isPublished === true && !data.publishedAt) {
        data.publishedAt = new Date()
        }

        const blog = await this.repo.update(id, data)
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