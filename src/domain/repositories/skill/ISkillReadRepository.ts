import type { Skill } from '../../entities/Skill'

// =============================================================================
// ISkillReadRepository
// Read interface for Skill aggregate.
// Separated from write — public API only ever reads skills, never writes.
// =============================================================================
export interface ISkillReadRepository {
    findPublished(): Promise<Skill[]>
    findAll(): Promise<Skill[]>
}