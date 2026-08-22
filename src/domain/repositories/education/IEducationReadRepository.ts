import { EducationDTO } from '../../../application/dtos/education/EducationDTO'

// =============================================================================
// IEducationReadRepository
// Read interface for Education aggregate.
// No publish filter — all education records shown publicly.
// Ordered by startedAt descending at repository level.
// =============================================================================
export interface IEducationReadRepository {
    findAll(): Promise<EducationDTO[]>
}
