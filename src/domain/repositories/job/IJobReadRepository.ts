import { JobDTO } from '../../../application/dtos/JobDTO'

// =============================================================================
// IJobReadRepository
// Read interface for Job aggregate.
// No publish filter — all job records shown publicly.
// Ordered by startedAt descending at repository level.
// =============================================================================
export interface IJobReadRepository {
    findAll(): Promise<JobDTO[]>
}
