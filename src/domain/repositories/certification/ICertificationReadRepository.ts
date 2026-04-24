import type { Certification } from '../../entities/Certification'

// =============================================================================
// ICertificationReadRepository
// Read interface for Certification aggregate.
// findPublished only — draft certifications never exposed publicly.
// Ordered by startDate descending at repository level.
// =============================================================================
export interface ICertificationReadRepository {
    findPublished(): Promise<Certification[]>
}