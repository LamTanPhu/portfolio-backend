import { Injectable, Inject } from '@nestjs/common'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'
import type { BlogDTO } from '../../../dtos/BlogDTO'

import { CACHE_TTL } from '../../../../infrastructure/cache/cache.constants'
import { CacheQueryService } from '../../../../infrastructure/cache/CacheQueryService'

// =============================================================================
// GetPublishedBlogsQuery
// Returns published blogs for public listing.
// Cached via CacheQueryService.
// =============================================================================
@Injectable()
export class GetPublishedBlogsQuery {
    constructor(
        @Inject('IBlogReadRepository')
        private readonly repo: IBlogReadRepository,

        private readonly cacheQuery: CacheQueryService,
    ) {}

    async execute(): Promise<BlogDTO[]> {
        return this.cacheQuery.getOrSet(
            'blog:list:public',
            CACHE_TTL.MEDIUM,
            () => this.repo.findPublished(),
        )
    }
}