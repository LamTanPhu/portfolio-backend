/**
 * @fileoverview DeleteJobCommand
 * 
 * Deletes a work experience record and invalidates the public cache.
 */

import { Injectable, Inject } from '@nestjs/common'
import type { IJobWriteRepository } from '../../../../domain/repositories/job/IJobWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

@Injectable()
export class DeleteJobCommand {
    constructor(
        @Inject('IJobWriteRepository')
        private readonly repo: IJobWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(id: number): Promise<void> {
        await this.repo.delete(id)

        // Invalidate public job list cache
        await this.cacheService.invalidatePublicJobs()
    }
}