/**
 * @fileoverview DeleteEducationCommand
 *
 * Deletes an education record and invalidates the public cache
 * so the frontend reflects the change immediately.
 */

import { Injectable, Inject } from '@nestjs/common'
import type { IEducationWriteRepository } from '../../../../domain/repositories/education/IEducationWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

@Injectable()
export class DeleteEducationCommand {
    constructor(
        @Inject('IEducationWriteRepository')
        private readonly repo: IEducationWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(id: number): Promise<void> {
        await this.repo.delete(id)

        // Invalidate public education list cache
        await this.cacheService.invalidatePublicEducation()
    }
}
