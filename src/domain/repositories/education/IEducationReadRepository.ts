import type { Education } from '../../entities/Education'

// =============================================================================
// IEducationReadRepository
// Read interface for Education aggregate.
// All education records shown publicly — no isPublished filter needed.
// =============================================================================
export interface IEducationReadRepository {
    findAll(): Promise<Education[]>
}