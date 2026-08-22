/**
 * @fileoverview GetBlogBySlugQuery
 *
 * Public query to fetch a single blog post by slug with caching.
 * Uses LONG cache profile (good balance between freshness and performance).
 */

import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'

import type { ICacheQueryService } from '../../../ports/ICacheQueryService'
import { BlogMapper } from '../../../mappers/BlogMapper'
import { BlogDetailDTO } from '../../../dtos/blog/BlogDetailDTO'
import { CACHE_QUERY_SERVICE } from '../../../../application/ports/cache.tokens'

@Injectable()
export class GetBlogBySlugQuery {
    constructor(
        @Inject('IBlogReadRepository')
        private readonly repo: IBlogReadRepository,

        @Inject(CACHE_QUERY_SERVICE)
        private readonly cacheQuery: ICacheQueryService,
    ) {}

    async execute(slug: string): Promise<BlogDetailDTO> {
        return this.cacheQuery.getOrSetWithProfile(`blog:${slug}`, 'LONG', async () => {
            const blog = await this.repo.findBySlug(slug)
            if (!blog) {
                throw new NotFoundError(`Blog not found: ${slug}`)
            }
            return BlogMapper.toDetailDTO(blog)
        })
    }
}
