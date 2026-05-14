/**
 * @fileoverview DeleteBlogCommand
 * 
 * Deletes a blog post and ensures all related caches are properly invalidated.
 */

import { Injectable, Inject } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'
import type { IBlogWriteRepository } from '../../../../domain/repositories/blog/IBlogWriteRepository'

import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'

@Injectable()
export class DeleteBlogCommand {
    constructor(
        @Inject('IBlogReadRepository')
        private readonly readRepo: IBlogReadRepository,

        @Inject('IBlogWriteRepository')
        private readonly writeRepo: IBlogWriteRepository,

        @Inject('ICacheInvalidationService')
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(id: number): Promise<void> {
        const blog = await this.readRepo.findById(id)
        if (!blog) {
            throw new NotFoundError(`Blog not found: ${id}`)
        }

        await this.writeRepo.delete(id)

        // Invalidate caches
        await this.cacheService.invalidatePublicBlogs()
        await this.cacheService.invalidateBlogBySlug(blog.slug)
    }
}