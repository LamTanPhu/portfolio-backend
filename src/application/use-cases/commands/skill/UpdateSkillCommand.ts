/**
 * @fileoverview UpdateSkillCommand
 *
 * Updates a skill record and invalidates the public skills cache.
 */

import { Injectable, Inject } from '@nestjs/common'
import type {
    ISkillWriteRepository,
    UpdateSkillInput,
} from '../../../../domain/repositories/skill/ISkillWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import type { SkillDTO } from '../../../dtos/SkillDTO'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

interface UpdateInput extends UpdateSkillInput {
    id: number
}

@Injectable()
export class UpdateSkillCommand {
    constructor(
        @Inject('ISkillWriteRepository')
        private readonly repo: ISkillWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(input: UpdateInput): Promise<SkillDTO> {
        const { id, ...data } = input

        const skill = await this.repo.update(id, data)

        // Invalidate public skills cache
        await this.cacheService.invalidatePublicSkills()

        return {
            id: skill.id,
            name: skill.name,
            imageUrl: skill.imageUrl,
            category: skill.category,
            isPublic: skill.isPublic,
        }
    }
}
