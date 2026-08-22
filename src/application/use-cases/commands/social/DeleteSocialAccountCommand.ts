/**
 * @fileoverview DeleteSocialAccountCommand
 *
 * Deletes a social account and invalidates the public cache.
 */

import { Inject, Injectable } from '@nestjs/common'
import type { ISocialAccountWriteRepository } from '../../../../domain/repositories/social/ISocialAccountWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

@Injectable()
export class DeleteSocialAccountCommand {
    constructor(
        @Inject('ISocialAccountWriteRepository')
        private readonly repo: ISocialAccountWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(id: number): Promise<void> {
        await this.repo.delete(id)

        // Invalidate public social accounts cache
        await this.cacheService.invalidatePublicSocialAccounts()
    }
}
