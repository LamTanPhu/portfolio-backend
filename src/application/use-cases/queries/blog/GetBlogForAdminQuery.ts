/**
 * @fileoverview GetBlogForAdminQuery
 *
 * Admin-only query that returns ONE blog post by slug — published or draft.
 * It exists because the public GetBlogBySlugQuery deliberately hides drafts,
 * yet the admin edit form has to be able to load them.
 *
 * Not cached, same reasoning as GetAllBlogsQuery: an editor must always see
 * the row as it is right now, and must never read (or populate) the public
 * cache key. Callers MUST sit behind JwtAuthGuard — this query performs no
 * authorization itself (authorization is an interface-adapter concern).
 */

import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'

import { BlogMapper } from '../../../mappers/BlogMapper'
import type { BlogDetailDTO } from '../../../dtos/blog/BlogDetailDTO'

@Injectable()
export class GetBlogForAdminQuery {
    constructor(
        @Inject('IBlogReadRepository')
        private readonly repo: IBlogReadRepository,
    ) {}

    async execute(slug: string): Promise<BlogDetailDTO> {
        const blog = await this.repo.findBySlug(slug)
        if (!blog) {
            throw new NotFoundError(`Blog not found: ${slug}`)
        }
        return BlogMapper.toDetailDTO(blog)
    }
}
