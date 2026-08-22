/**
 * @fileoverview DeleteSkillCommand
 *
 * Deletes a skill record and invalidates the public skills cache.
 */

import { Inject, Injectable } from '@nestjs/common'
import type { ISkillWriteRepository } from '../../../../domain/repositories/skill/ISkillWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

@Injectable()
export class DeleteSkillCommand {
    constructor(
        @Inject('ISkillWriteRepository')
        private readonly repo: ISkillWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(id: number): Promise<void> {
        await this.repo.delete(id)

        // Invalidate public skills cache
        await this.cacheService.invalidatePublicSkills()
    }
}
