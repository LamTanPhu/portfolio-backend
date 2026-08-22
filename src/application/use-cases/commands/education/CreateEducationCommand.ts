/**
 * @fileoverview CreateEducationCommand
 */

import { Injectable, Inject } from '@nestjs/common'
import type {
    IEducationWriteRepository,
    CreateEducationInput,
} from '../../../../domain/repositories/education/IEducationWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import type { EducationDTO } from '../../../dtos/education/EducationDTO'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

@Injectable()
export class CreateEducationCommand {
    constructor(
        @Inject('IEducationWriteRepository')
        private readonly repo: IEducationWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(input: CreateEducationInput): Promise<EducationDTO> {
        const education = await this.repo.create(input)

        await this.cacheService.invalidatePublicEducation()

        return {
            id: education.id,
            degreeName: education.degreeName,
            instituteName: education.instituteName,
            instituteUrl: education.instituteUrl,
            startedAt: education.startedAt.toISOString(),
            endedAt: education.endedAt?.toISOString() ?? null,
            isCompleted: education.isCompleted,
        }
    }
}
