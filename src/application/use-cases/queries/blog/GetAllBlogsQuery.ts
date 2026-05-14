/**
 * @fileoverview GetAllBlogsQuery
 * 
 * Admin-only query that returns all blog posts (including drafts).
 * No caching is applied because admin views require absolute freshness.
 */

import { Injectable, Inject } from '@nestjs/common'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'

import { BlogMapper } from '../../../mappers/BlogMapper'
import { BlogSummaryDTO } from '../../../dtos/blog/BlogSummaryDTO'

@Injectable()
export class GetAllBlogsQuery {
    constructor(
        @Inject('IBlogReadRepository')
        private readonly repo: IBlogReadRepository,
    ) {}

    async execute(): Promise<BlogSummaryDTO[]> {
        const summaries = await this.repo.findAll()
        return BlogMapper.summaryListToDTO(summaries)
    }
}