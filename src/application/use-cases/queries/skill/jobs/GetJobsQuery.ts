import { Injectable, Inject } from '@nestjs/common'
import type { IJobReadRepository } from '../../../../../domain/repositories/job/IJobReadRepository'
import type { JobDTO } from '../../../../dtos/JobDTO'

// =============================================================================
// GetJobsQuery
// Returns all work experience ordered by most recent first.
// No publish filter — all job records shown publicly.
// endedAt null = currently employed at this company.
// Dates serialized as ISO 8601 strings — domain Date objects never cross layers.
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