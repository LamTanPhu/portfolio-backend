import { EducationDTO } from '../../../application/dtos/education/EducationDTO'

// =============================================================================
// IEducationReadRepository
// Read interface for Education aggregate.
// findPublished returns only isPublic records — hidden records never exposed.
// findAll returns every record — admin use only.
// Both ordered by startedAt descending at repository level.
// =============================================================================
export interface IEducationReadRepository {
    findPublished(): Promise<EducationDTO[]>
    findAll(): Promise<EducationDTO[]>
}
