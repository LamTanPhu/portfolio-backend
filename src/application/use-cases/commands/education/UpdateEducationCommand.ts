/**
 * @fileoverview UpdateEducationCommand
 *
 * Updates an education record and invalidates the public cache.
 */

import { Injectable, Inject } from '@nestjs/common'
import type {
    IEducationWriteRepository,
    UpdateEducationInput,
} from '../../../../domain/repositories/education/IEducationWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import type { EducationDTO } from '../../../dtos/education/EducationDTO'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

interface UpdateInput extends UpdateEducationInput {
    id: number
}

@Injectable()
export class UpdateEducationCommand {
    constructor(
        @Inject('IEducationWriteRepository')
        private readonly repo: IEducationWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(input: UpdateInput): Promise<EducationDTO> {
        const { id, ...data } = input

        const updated = await this.repo.update(id, data)

        // Always invalidate public list cache after update
        await this.cacheService.invalidatePublicEducation()

        return {
            id: updated.id,
            degreeName: updated.degreeName,
            instituteName: updated.instituteName,
            instituteUrl: updated.instituteUrl,
            startedAt: updated.startedAt.toISOString(),
            endedAt: updated.endedAt?.toISOString() ?? null,
            isCompleted: updated.isCompleted,
        }
    }
}
