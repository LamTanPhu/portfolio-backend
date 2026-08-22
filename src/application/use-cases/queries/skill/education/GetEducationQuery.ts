/**
 * @fileoverview GetEducationQuery
 *
 * Public query returning all education records with caching.
 * Uses LONG cache profile (education data changes infrequently).
 */

import { Inject, Injectable } from '@nestjs/common'
import type { IEducationReadRepository } from '../../../../../domain/repositories/education/IEducationReadRepository'
import { EducationDTO } from '../../../../dtos/education/EducationDTO'
import type { ICacheQueryService } from '../../../../ports/ICacheQueryService'
import { CACHE_QUERY_SERVICE } from '../../../../../application/ports/cache.tokens'

@Injectable()
export class GetEducationQuery {
    constructor(
        @Inject('IEducationReadRepository')
        private readonly repo: IEducationReadRepository,

        @Inject(CACHE_QUERY_SERVICE)
        private readonly cacheQuery: ICacheQueryService,
    ) {}

    async execute(): Promise<EducationDTO[]> {
        return this.cacheQuery.getOrSetWithProfile('education:list:public', 'LONG', async () => {
            const records = await this.repo.findAll()
            return records
        })
    }
}
