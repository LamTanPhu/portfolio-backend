import { Inject, Injectable } from '@nestjs/common'
import type {
    IJobWriteRepository,
    UpdateJobInput,
} from '../../../../domain/repositories/job/IJobWriteRepository'
import type { JobDTO } from '../../../dtos/JobDTO'

interface Input extends UpdateJobInput {
    id: number
}

// =============================================================================
// UpdateJobCommand
// NotFoundError thrown by repository if id does not exist — no pre-check needed.
// O(1) — single DB query, no read-before-write.
// =============================================================================
@Injectable()
export class UpdateJobCommand {
    constructor(
        @Inject('IJobWriteRepository')
        private readonly repo: IJobWriteRepository,
    ) {}

    async execute(input: Input): Promise<JobDTO> {
        const { id, ...data } = input
        const job = await this.repo.update(id, data)
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