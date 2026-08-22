/**
 * @fileoverview GetPublishedBlogsQuery
 *
 * Public query returning published blog summaries for listing pages.
 * Uses MEDIUM cache profile.
 */

import { Inject, Injectable } from '@nestjs/common'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'

import type { ICacheQueryService } from '../../../ports/ICacheQueryService'
import { BlogMapper } from '../../../mappers/BlogMapper'
import { CACHE_QUERY_SERVICE } from '../../../../application/ports/cache.tokens'
import { BlogSummaryDTO } from '../../../dtos/blog/BlogSummaryDTO'

@Injectable()
export class GetPublishedBlogsQuery {
    constructor(
        @Inject('IBlogReadRepository')
        private readonly repo: IBlogReadRepository,

        @Inject(CACHE_QUERY_SERVICE)
        private readonly cacheQuery: ICacheQueryService,
    ) {}

    async execute(): Promise<BlogSummaryDTO[]> {
        return this.cacheQuery.getOrSetWithProfile('blog:list:public', 'MEDIUM', async () => {
            const summaries = await this.repo.findPublished()
            return BlogMapper.summaryListToDTO(summaries)
        })
    }
}
