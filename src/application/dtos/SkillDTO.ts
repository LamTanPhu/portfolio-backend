// =============================================================================
// SkillDTO
// Output shape for published skills.
// category serialized as string — SkillCategory enum never crosses layer boundary.
// =============================================================================
export interface SkillDTO {
    id:       number
    name:     string
    imageUrl: string | null
    category: string
}