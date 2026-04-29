import { Inject, Injectable } from '@nestjs/common'
import type {
    CreateJobInput,
    IJobWriteRepository,
} from '../../../../domain/repositories/job/IJobWriteRepository'
import type { JobDTO } from '../../../dtos/JobDTO'

// =============================================================================
// CreateJobCommand
// Creates a new work experience record for the portfolio owner.
// userId from verified JWT payload — never from client input.
// =============================================================================
@Injectable()
export class CreateJobCommand {
    constructor(
        @Inject('IJobWriteRepository')
        private readonly repo: IJobWriteRepository,
    ) {}

    async execute(input: CreateJobInput): Promise<JobDTO> {
        const job = await this.repo.create(input)
        return {
        id:          job.id,
        companyName: job.companyName,
        role:        job.role,
        startedAt:   job.startedAt.toISOString(),
        endedAt:     job.endedAt?.toISOString() ?? null,
        isEnded:     job.isEnded,
        }
    }
}