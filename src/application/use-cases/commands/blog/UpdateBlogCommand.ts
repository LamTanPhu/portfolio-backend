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

        @Inject('ICacheInvalidationService')
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(input: UpdateInput): Promise<BlogDetailDTO> {
        const { id, ...data } = input

        const existing = await this.readRepo.findById(id)
        if (!existing) {
        throw new NotFoundError(`Blog not found: ${id}`)
        }

        // Auto-set publishedAt when publishing for the first time
        if (data.isPublished === true && !data.publishedAt) {
        data.publishedAt = new Date()
        }

        const updatedBlog = await this.writeRepo.update(id, data)

        // Cache invalidation
        await this.cacheService.invalidatePublicBlogs()
        await this.cacheService.invalidateBlogBySlug(existing.slug)

        // Invalidate new slug if it changed
        if (existing.slug !== updatedBlog.slug) {
        await this.cacheService.invalidateBlogBySlug(updatedBlog.slug)
        }

        return BlogMapper.toDetailDTO(updatedBlog)
    }
}