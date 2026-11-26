/**
 * @fileoverview UpdateProjectCommand
 *
 * Updates a project and performs comprehensive cache invalidation.
 *
 * Cache correctness matters for SECURITY here, not just freshness: the public
 * GET /projects/:slug serves only published projects, so unpublishing must take
 * effect at once. A PATCH like { isPublished: false } carries no slug, so the
 * slug the project had BEFORE the update is read first (same approach as
 * UpdateBlogCommand / DeleteProjectCommand) and every public detail key the
 * project may be cached under is dropped — otherwise an unpublished project
 * would keep being served from cache until its TTL expired.
 */

import { Injectable, Inject } from '@nestjs/common'
import type { IProjectReadRepository } from '../../../../domain/repositories/project/IProjectReadRepository'
import type {
    IProjectWriteRepository,
    UpdateProjectInput,
} from '../../../../domain/repositories/project/IProjectWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import type { ProjectDTO } from '../../../dtos/ProjectDTO'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

interface UpdateInput extends UpdateProjectInput {
    id: number
}

@Injectable()
export class UpdateProjectCommand {
    constructor(
        @Inject('IProjectReadRepository')
        private readonly readRepo: IProjectReadRepository,

        @Inject('IProjectWriteRepository')
        private readonly repo: IProjectWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(input: UpdateInput): Promise<ProjectDTO> {
        const { id, ...data } = input

        // Slug BEFORE the update — a rename or an unpublish must drop the entry
        // cached under the OLD slug. Not-found is left to repo.update(), which
        // already throws NotFoundError for it.
        const existing = await this.readRepo.findById(id)

        const updated = await this.repo.update(id, data)

        // Invalidate caches
        await this.cacheService.invalidatePublicProjects()

        // Every public detail key this project could be cached under: the slug it
        // had, the slug it has now, and a slug supplied in the payload (a Set, so
        // an unchanged slug is invalidated once).
        const slugs = new Set([existing?.slug, updated.slug, data.slug].filter((slug): slug is string => Boolean(slug)))
        for (const slug of slugs) {
            await this.cacheService.invalidateProjectBySlug(slug)
        }

        return {
            id: updated.id,
            name: updated.name,
            description: updated.description,
            slug: updated.slug,
            techStack: updated.techStack,
            repoUrl: updated.repoUrl,
            liveUrl: updated.liveUrl,
            thumbnailUrl: updated.thumbnailUrl,
            isPublished: updated.isPublished,
            isOpenSource: updated.isOpenSource,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
        }
    }
}
