/**
 * @fileoverview UpdateBlogCommand
 * 
 * Updates an existing blog post and performs comprehensive cache invalidation.
 * Handles slug changes gracefully.
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
import { CACHE_INVALIDATION_SERVICE } from '../../../../infrastructure/cache/cache.module'
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

        // Always invalidate public list and the original slug
        await this.cacheService.invalidatePublicBlogs()
        await this.cacheService.invalidateBlogBySlug(existing.slug)

        // Invalidate new slug if it changed — both old and new must be cleared
        if (existing.slug !== updatedBlog.slug) {
            await this.cacheService.invalidateBlogBySlug(updatedBlog.slug)
        }

        return BlogMapper.toDetailDTO(updatedBlog)
    }
}