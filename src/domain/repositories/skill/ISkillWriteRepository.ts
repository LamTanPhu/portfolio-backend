import type { Skill, SkillCategory } from '../../entities/Skill'

// =============================================================================
// CreateSkillInput
// =============================================================================
export interface CreateSkillInput {
    name:      string
    imageUrl:  string | null
    category:  SkillCategory
    isPublic:  boolean
    userId:    number
}

// =============================================================================
// UpdateSkillInput
// =============================================================================
export interface UpdateSkillInput {
    name?:     string
    imageUrl?: string | null
    category?: SkillCategory
    isPublic?: boolean
}

// =============================================================================
// ISkillWriteRepository
// Write interface for Skill aggregate — separated from read per ISP.
// =============================================================================
export interface ISkillWriteRepository {
    create(data: CreateSkillInput): Promise<Skill>
    update(id: number, data: UpdateSkillInput): Promise<Skill>
    delete(id: number): Promise<void>
}