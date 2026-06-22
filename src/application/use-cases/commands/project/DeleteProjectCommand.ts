/**
 * @fileoverview DeleteProjectCommand
 * 
 * Deletes a project and invalidates related caches.
 * Uses Read repository to get slug before deletion for proper cache cleanup.
 */

import { Injectable, Inject } from '@nestjs/common'
import type { IProjectReadRepository } from '../../../../domain/repositories/project/IProjectReadRepository'
import type { IProjectWriteRepository } from '../../../../domain/repositories/project/IProjectWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

@Injectable()
export class DeleteProjectCommand {
    constructor(
        @Inject('IProjectReadRepository')
        private readonly readRepo: IProjectReadRepository,

        @Inject('IProjectWriteRepository')
        private readonly writeRepo: IProjectWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(id: number): Promise<void> {
        // Get project details before deletion for cache invalidation
        const project = await this.readRepo.findById(id)

        await this.writeRepo.delete(id)

        // Invalidate caches
        await this.cacheService.invalidatePublicProjects()

        if (project?.slug) {
            await this.cacheService.invalidateProjectBySlug(project.slug)
        }
    }
}