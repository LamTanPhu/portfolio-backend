import type { Certification } from '../../entities/Certification'

// =============================================================================
// ICertificationReadRepository
// Read interface for Certification aggregate.
// Only published certifications returned via findPublished.
// =============================================================================
export interface ICertificationReadRepository {
    findPublished(): Promise<Certification[]>
}