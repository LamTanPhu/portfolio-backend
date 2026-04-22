import type { Job } from '../../entities/Job'

// =============================================================================
// IJobReadRepository
// Read interface for Job aggregate.
// All job records shown publicly — ordered by start date descending.
// =============================================================================
export interface IJobReadRepository {
    findAll(): Promise<Job[]>
}