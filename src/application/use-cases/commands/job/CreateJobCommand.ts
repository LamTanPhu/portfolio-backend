/**
 * @fileoverview CreateJobCommand
 *
 * Creates a new work experience record and invalidates the public cache.
 */

import { Injectable, Inject } from '@nestjs/common'
import type { IJobWriteRepository, CreateJobInput } from '../../../../domain/repositories/job/IJobWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import type { JobDTO } from '../../../dtos/JobDTO'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

@Injectable()
export class CreateJobCommand {
    constructor(
        @Inject('IJobWriteRepository')
        private readonly repo: IJobWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(input: CreateJobInput): Promise<JobDTO> {
        const job = await this.repo.create(input)

        // Invalidate public job list cache
        await this.cacheService.invalidatePublicJobs()

        return {
            id: job.id,
            companyName: job.companyName,
            role: job.role,
            startedAt: job.startedAt.toISOString(),
            endedAt: job.endedAt?.toISOString() ?? null,
            isEnded: job.isEnded,
        }
    }
}
