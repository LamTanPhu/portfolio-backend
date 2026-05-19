/**
 * @fileoverview CreateSkillCommand
 * 
 * Creates a new skill record and invalidates the public skills cache.
 */

import { Injectable, Inject } from '@nestjs/common'
import type { CreateSkillInput, ISkillWriteRepository } from '../../../../domain/repositories/skill/ISkillWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import type { SkillDTO } from '../../../dtos/SkillDTO'

@Injectable()
export class CreateSkillCommand {
    constructor(
        @Inject('ISkillWriteRepository')
        private readonly repo: ISkillWriteRepository,

        @Inject('ICacheInvalidationService')
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(input: CreateSkillInput): Promise<SkillDTO> {
        const skill = await this.repo.create(input)

        // Invalidate public skills cache
        await this.cacheService.invalidatePublicSkills()

        return {
        id:       skill.id,
        name:     skill.name,
        imageUrl: skill.imageUrl,
        category: skill.category,
        }
    }
}