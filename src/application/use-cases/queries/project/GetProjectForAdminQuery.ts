/**
 * @fileoverview GetProjectForAdminQuery
 *
 * Admin-only query that returns ONE project by slug — published or draft.
 * The public GetProjectBySlugQuery hides drafts, so the admin edit form
 * needs this uncached, guarded counterpart (see GetBlogForAdminQuery).
 * Callers MUST sit behind JwtAuthGuard.
 */

import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { IProjectReadRepository } from '../../../../domain/repositories/project/IProjectReadRepository'
import type { ProjectDTO } from '../../../dtos/ProjectDTO'

@Injectable()
export class GetProjectForAdminQuery {
    constructor(
        @Inject('IProjectReadRepository')
        private readonly repo: IProjectReadRepository,
    ) {}

    async execute(slug: string): Promise<ProjectDTO> {
        const project = await this.repo.findBySlug(slug)
        if (!project) {
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
    }
}
