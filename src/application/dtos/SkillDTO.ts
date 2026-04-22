// =============================================================================
// SkillDTO
// Output shape for published skills — category as string for serialization.
// =============================================================================
export interface SkillDTO {
    id:       number
    name:     string
    imageUrl: string | null
    category: string
}