// =============================================================================
// SocialAccountDTO
// Output shape for public social accounts — GitHub, LinkedIn, etc.
// imageUrl null when platform has no custom icon configured.
// =============================================================================
export interface SocialAccountDTO {
    id:       number
    name:     string
    url:      string
    imageUrl: string | null
}