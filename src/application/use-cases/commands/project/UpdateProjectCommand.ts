/**
 * @fileoverview UpdateProjectCommand
 * 
 * Updates a project and performs comprehensive cache invalidation.
 */

import { Injectable, Inject } from '@nestjs/common'
import type {
    IProjectWriteRepository,
    UpdateProjectInput,
} from '../../../../domain/repositories/project/IProjectWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import type { ProjectDTO } from '../../../dtos/ProjectDTO'

interface UpdateInput extends UpdateProjectInput {
    id: number
}

@Injectable()
export class UpdateProjectCommand {
    constructor(
        @Inject('IProjectWriteRepository')
        private readonly repo: IProjectWriteRepository,

        @Inject('ICacheInvalidationService')
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(input: UpdateInput): Promise<ProjectDTO> {
        const { id, ...data } = input

        const updated = await this.repo.update(id, data)

        // Invalidate caches
        await this.cacheService.invalidatePublicProjects()

        if (data.slug) {
        await this.cacheService.invalidateProjectBySlug(data.slug)
        }

        return {
        id:           updated.id,
        name:         updated.name,
        description:  updated.description,
        slug:         updated.slug,
        techStack:    updated.techStack,
        repoUrl:      updated.repoUrl,
        liveUrl:      updated.liveUrl,
        thumbnailUrl: updated.thumbnailUrl,
        isPublished:  updated.isPublished,
        isOpenSource: updated.isOpenSource,
        createdAt:    updated.createdAt.toISOString(),
        updatedAt:    updated.updatedAt.toISOString(),
        }
    }
}