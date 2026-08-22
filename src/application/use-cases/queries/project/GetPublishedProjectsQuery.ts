/**
 * @fileoverview GetPublishedProjectsQuery
 *
 * Returns all published projects for public display.
 * Uses MEDIUM cache profile.
 */

import { Inject, Injectable } from '@nestjs/common'
import type { IProjectReadRepository } from '../../../../domain/repositories/project/IProjectReadRepository'

import type { ICacheQueryService } from '../../../ports/ICacheQueryService'
import type { ProjectDTO, ProjectSummaryDTO } from '../../../dtos/ProjectDTO'
import { CACHE_QUERY_SERVICE } from '../../../../application/ports/cache.tokens'

@Injectable()
export class GetPublishedProjectsQuery {
    constructor(
        @Inject('IProjectReadRepository')
        private readonly repo: IProjectReadRepository,

        @Inject(CACHE_QUERY_SERVICE)
        private readonly cacheQuery: ICacheQueryService,
    ) {}

    async execute(): Promise<ProjectSummaryDTO[]> {
        return this.cacheQuery.getOrSetWithProfile('project:list:public', 'MEDIUM', async () => {
            const projects = await this.repo.findPublished()

            return projects.map((p) => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                techStack: p.techStack,
                repoUrl: p.repoUrl,
                liveUrl: p.liveUrl,
                thumbnailUrl: p.thumbnailUrl,
                isPublished: p.isPublished,
                isOpenSource: p.isOpenSource,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
            }))
        })
    }
}
