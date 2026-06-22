/**
 * @fileoverview GetPublishedSkillsQuery
 * 
 * Returns all public skills ordered by category.
 * Uses LONG cache profile (skills change infrequently).
 */

import { Inject, Injectable } from '@nestjs/common'
import type { ISkillReadRepository } from '../../../../domain/repositories/skill/ISkillReadRepository'

import { CACHE_QUERY_SERVICE } from '../../../../application/ports/cache.tokens'
import type { SkillDTO } from '../../../dtos/SkillDTO'
import type { ICacheQueryService } from '../../../ports/ICacheQueryService'

@Injectable()
export class GetPublishedSkillsQuery {
    constructor(
        @Inject('ISkillReadRepository')
        private readonly repo: ISkillReadRepository,

        @Inject(CACHE_QUERY_SERVICE)
        private readonly cacheQuery: ICacheQueryService,
    ) {}

    async execute(): Promise<SkillDTO[]> {
        return this.cacheQuery.getOrSetWithProfile(
            'skill:list:public',
            'LONG',
            async () => {
                const skills = await this.repo.findPublished()
                return skills
            },
        )
    }
}