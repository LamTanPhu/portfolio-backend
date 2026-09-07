import { JobDTO } from '../../../application/dtos/JobDTO'

// =============================================================================
// IJobReadRepository
// Read interface for Job aggregate.
// findPublished returns only isPublic records — hidden records never exposed.
// findAll returns every record — admin use only.
// Both ordered by startedAt descending at repository level.
// =============================================================================
export interface IJobReadRepository {
    findPublished(): Promise<JobDTO[]>
    findAll(): Promise<JobDTO[]>
}
