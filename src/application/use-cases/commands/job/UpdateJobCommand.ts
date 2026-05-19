/**
 * @fileoverview UpdateJobCommand
 * 
 * Updates a work experience record and invalidates the public cache.
 */

import { Inject, Injectable } from '@nestjs/common'
import type {
    IJobWriteRepository,
    UpdateJobInput,
} from '../../../../domain/repositories/job/IJobWriteRepository'
import type { JobDTO } from '../../../dtos/JobDTO'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'

interface UpdateInput extends UpdateJobInput {
    id: number
}

@Injectable()
export class UpdateJobCommand {
    constructor(
        @Inject('IJobWriteRepository')
        private readonly repo: IJobWriteRepository,

        @Inject('ICacheInvalidationService')
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(input: UpdateInput): Promise<JobDTO> {
        const { id, ...data } = input

        const updated = await this.repo.update(id, data)

        // Invalidate public list cache after update
        await this.cacheService.invalidatePublicJobs()

        return {
        id: updated.id,
        companyName: updated.companyName,
        role: updated.role,
        startedAt: updated.startedAt.toISOString(),
        endedAt: updated.endedAt?.toISOString() ?? null,
        isEnded: updated.isEnded,
        }
    }
}