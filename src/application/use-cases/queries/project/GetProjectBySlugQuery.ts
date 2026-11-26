/**
 * @fileoverview GetProjectBySlugQuery
 *
 * Returns full project details by slug.
 * Uses LONG cache profile (project details change infrequently).
 *
 * SECURITY: only PUBLISHED projects are visible here. An unpublished draft is
 * reported as "not found", identical to a slug that does not exist, and the
 * check runs inside the cache loader so a draft is never cached under the
 * public key. Admins read drafts through GetProjectForAdminQuery instead.
 */

import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { IProjectReadRepository } from '../../../../domain/repositories/project/IProjectReadRepository'

import type { ICacheQueryService } from '../../../ports/ICacheQueryService'
import type { ProjectDTO } from '../../../dtos/ProjectDTO'
import { CACHE_QUERY_SERVICE } from '../../../../application/ports/cache.tokens'

@Injectable()
export class GetProjectBySlugQuery {
    constructor(
        @Inject('IProjectReadRepository')
        private readonly repo: IProjectReadRepository,

        @Inject(CACHE_QUERY_SERVICE)
        private readonly cacheQuery: ICacheQueryService,
    ) {}

    async execute(slug: string): Promise<ProjectDTO> {
        return this.cacheQuery.getOrSetWithProfile(`project:${slug}`, 'LONG', async () => {
            const project = await this.repo.findBySlug(slug)
            if (!project?.isPublished) {
                throw new NotFoundError(`Project not found: ${slug}`)
            }

            return {
                id: project.id,
                name: project.name,
                description: project.description,
                slug: project.slug,
                techStack: project.techStack,
                repoUrl: project.repoUrl,
                liveUrl: project.liveUrl,
                thumbnailUrl: project.thumbnailUrl,
                isPublished: project.isPublished,
                isOpenSource: project.isOpenSource,
                createdAt: project.createdAt.toISOString(),
                updatedAt: project.updatedAt.toISOString(),
            }
        })
    }
}
