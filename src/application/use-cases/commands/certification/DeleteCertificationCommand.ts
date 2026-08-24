/**
 * @fileoverview DeleteCertificationCommand
 *
 * Deletes a certification and invalidates the public cache.
 */

import { Injectable, Inject } from '@nestjs/common'
import type { ICertificationWriteRepository } from '../../../../domain/repositories/certification/ICertificationWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

@Injectable()
export class DeleteCertificationCommand {
    constructor(
        @Inject('ICertificationWriteRepository')
        private readonly repo: ICertificationWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(id: number): Promise<void> {
        await this.repo.delete(id)
        // Invalidate public cache so deleted item disappears from frontend
        await this.cacheService.invalidatePublicCertifications()
    }
}
