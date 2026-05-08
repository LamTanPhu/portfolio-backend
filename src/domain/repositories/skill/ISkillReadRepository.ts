import { SkillDTO } from '../../../application/dtos/SkillDTO'
import type { Skill } from '../../entities/Skill'

// =============================================================================
// ISkillReadRepository
// Read interface for Skill aggregate — separated from write per ISP.
// findPublished returns only isPublic skills — hidden skills never exposed.
// findAll returns all skills — admin use only.
// Both ordered by category alphabetically at repository level.
// =============================================================================
export interface ISkillReadRepository {
    findPublished(): Promise<SkillDTO[]>
    findAll(): Promise<SkillDTO[]>
    findById(id: number): Promise<Skill | null>
}