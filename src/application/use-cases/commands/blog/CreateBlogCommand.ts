/**
 * @fileoverview CreateBlogCommand
 *
 * Creates a new blog post and handles cache invalidation.
 * Emits BlogPublishedEvent when a post is created in published state.
 */

import { Injectable, Inject } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Slug } from '../../../../domain/value-objects/Slug'
import type { IBlogWriteRepository } from '../../../../domain/repositories/blog/IBlogWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import { BlogPublishedEvent } from '../../../../domain/events/BlogPublishedEvent'
import { BlogMapper } from '../../../mappers/BlogMapper'
import { CACHE_INVALIDATION_SERVICE } from '../../../../infrastructure/cache/cache.module'
import { BlogDetailDTO } from '../../../dtos/blog/BlogDetailDTO'

@Injectable()
export class CreateBlogCommand {
    constructor(
        @Inject('IBlogWriteRepository')
        private readonly repo: IBlogWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,

        // Event bus — decouples publish side effects from core write logic
        private readonly eventEmitter: EventEmitter2,
    ) {}

    async execute(input: {
        title:       string
        content:     string
        excerpt?:    string | null
        tags?:       string[]
        isPublished: boolean
        userId:      number
    }): Promise<BlogDetailDTO> {
        const slug = Slug.from(input.title)

        const blog = await this.repo.create({
            title:       input.title,
            slug:        slug.toString(),
            content:     input.content,
            excerpt:     input.excerpt ?? null,
            tags:        input.tags ?? [],
            isPublished: input.isPublished,
            publishedAt: input.isPublished ? new Date() : null,
            userId:      input.userId,
        })

        // Cache invalidation
        await this.cacheService.invalidatePublicBlogs()
        if (input.isPublished) {
            await this.cacheService.invalidateBlogBySlug(slug.toString())
        }

        // Emit domain event when blog goes live — downstream handlers can
        // extend behaviour (notifications, sitemap pings, etc.) without
        // touching this command.
        if (input.isPublished) {
            this.eventEmitter.emit(
                'blog.published',
                new BlogPublishedEvent(blog.id, slug.toString()),
            )
        }

        return BlogMapper.toDetailDTO(blog)
    }
}