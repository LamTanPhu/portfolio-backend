/**
 * @fileoverview UpdateBlogCommand
 *
 * Updates an existing blog post and invalidates the relevant caches.
 *
 * INTENTIONAL DESIGN — Slug stability:
 * Slugs are deliberately NOT regenerated when the title changes, and this
 * command has no way to change a slug at all — UpdateBlogInput excludes it.
 * Once a post is published, its slug is its permanent URL identity.
 * Regenerating on title edit would silently break:
 *   - All external links and bookmarks pointing to the old URL
 *   - Search engine indexes (SEO penalty)
 *   - Any frontend routes cached by CDN or browser
 *
 * To change a slug, a dedicated operation with explicit uniqueness
 * checking must be implemented. No current use case requires this.
 */

import { Injectable, Inject } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'
import type {
    IBlogWriteRepository,
    UpdateBlogInput,
} from '../../../../domain/repositories/blog/IBlogWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import { BlogMapper } from '../../../mappers/BlogMapper'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'
import { BlogDetailDTO } from '../../../dtos/blog/BlogDetailDTO'

interface UpdateInput extends UpdateBlogInput {
    id: number
}

@Injectable()
export class UpdateBlogCommand {
    constructor(
        @Inject('IBlogReadRepository')
        private readonly readRepo: IBlogReadRepository,

        @Inject('IBlogWriteRepository')
        private readonly writeRepo: IBlogWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(input: UpdateInput): Promise<BlogDetailDTO> {
        const { id, ...data } = input

        const existing = await this.readRepo.findById(id)
        if (!existing) {
            throw new NotFoundError(`Blog not found: ${id}`)
        }

        // Auto-set publishedAt when publishing for the first time.
        // Spread into new object — avoids mutating the caller's input.
        const payload: UpdateBlogInput = data.isPublished === true && !data.publishedAt
            ? { ...data, publishedAt: new Date() }
            : { ...data }

        const updatedBlog = await this.writeRepo.update(id, payload)

        // Invalidate public list and this post's (immutable) slug cache entry.
        // No separate "new slug" invalidation needed — slug cannot change here.
        await this.cacheService.invalidatePublicBlogs()
        await this.cacheService.invalidateBlogBySlug(existing.slug)

        return BlogMapper.toDetailDTO(updatedBlog)
    }
}