import { Injectable, Inject } from '@nestjs/common'

import { NotFoundError } from '../../../../domain/errors/NotFoundError'

import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'

import type {
    IBlogWriteRepository,
    UpdateBlogInput,
} from '../../../../domain/repositories/blog/IBlogWriteRepository'

import type { BlogDTO } from '../../../dtos/BlogDTO'

import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'

interface Input extends UpdateBlogInput {
    id: number
}

// =============================================================================
// UpdateBlogCommand
// Updates blog and invalidates:
// - public list cache
// - old slug cache
// - new slug cache (if slug changed)
// =============================================================================
@Injectable()
export class UpdateBlogCommand {
    constructor(
        @Inject('IBlogReadRepository')
        private readonly readRepo: IBlogReadRepository,

        @Inject('IBlogWriteRepository')
        private readonly writeRepo: IBlogWriteRepository,

        @Inject('ICacheInvalidationService')
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(input: Input): Promise<BlogDTO> {
        const { id, ...data } = input

        // =========================================================================
        // Fetch existing entity first.
        // Required for:
        // - existence validation
        // - old slug cache invalidation
        // =========================================================================
        const existing = await this.readRepo.findById(id)

        if (!existing) {
            throw new NotFoundError(`Blog not found: ${id}`)
        }

        // =========================================================================
        // Auto-set publishedAt when publishing for the first time.
        // =========================================================================
        if (data.isPublished === true && !data.publishedAt) {
            data.publishedAt = new Date()
        }

        // =========================================================================
        // Persist update
        // =========================================================================
        const blog = await this.writeRepo.update(id, data)

        // =========================================================================
        // Cache invalidation
        // =========================================================================

        // Public listing cache
        await this.cacheService.invalidatePublicBlogs()

        // Old slug cache
        await this.cacheService.invalidateBlogBySlug(existing.slug)

        // New slug cache (only if slug changed)
        if (existing.slug !== blog.slug) {
            await this.cacheService.invalidateBlogBySlug(blog.slug)
        }

        // =========================================================================
        // DTO mapping
        // =========================================================================
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