/**
 * @fileoverview SearchBlogsQuery
 *
 * Public full-text search over published blog posts.
 * Uses SHORT cache profile — unlike the list/detail queries, every unique
 * query string is effectively its own cache entry, so a long TTL would
 * bloat the cache with low-reuse results for very little benefit.
 */

import { Inject, Injectable } from '@nestjs/common'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'

import { CACHE_QUERY_SERVICE } from '../../../../application/ports/cache.tokens'
import { BlogSummaryDTO } from '../../../dtos/blog/BlogSummaryDTO'
import { BlogMapper } from '../../../mappers/BlogMapper'
import type { ICacheQueryService } from '../../../ports/ICacheQueryService'

@Injectable()
export class SearchBlogsQuery {
    constructor(
        @Inject('IBlogReadRepository')
        private readonly repo: IBlogReadRepository,

        @Inject(CACHE_QUERY_SERVICE)
        private readonly cacheQuery: ICacheQueryService,
    ) {}

    async execute(query: string): Promise<BlogSummaryDTO[]> {
        // Normalized before it ever becomes a cache key — "React", "react",
        // and " react " should all hit the same cache entry rather than
        // three separate ones for what's really one search.
        const normalized = query.trim().toLowerCase()

        return this.cacheQuery.getOrSetWithProfile(`blog:search:${normalized}`, 'SHORT', async () => {
            const summaries = await this.repo.search(normalized)
            return BlogMapper.summaryListToDTO(summaries)
        })
    }
}
