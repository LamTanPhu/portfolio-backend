import { Injectable, Inject } from '@nestjs/common'
import type { IJobReadRepository } from '../../../../../domain/repositories/job/IJobReadRepository'
import type { JobDTO } from '../../../../dtos/JobDTO'

// =============================================================================
// GetJobsQuery
// Returns all work experience ordered by most recent first.
// =============================================================================
@Injectable()
export class GetJobsQuery {
    constructor(
        @Inject('IJobReadRepository')
        private readonly repo: IJobReadRepository,
    ) {}

    async execute(): Promise<JobDTO[]> {
        const jobs = await this.repo.findAll()
        return jobs.map((j) => ({
            id:          j.id,
            companyName: j.companyName,
            role:        j.role,
            startedAt:   j.startedAt.toISOString(),
            endedAt:     j.endedAt?.toISOString() ?? null,
            isEnded:     j.isEnded,
        }))
    }
}