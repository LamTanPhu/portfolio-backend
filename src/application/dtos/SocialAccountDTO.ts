// =============================================================================
// SocialAccountDTO
// Output shape for public social accounts.
// imageUrl optional — not all platforms have a custom icon.
// =============================================================================
export interface SocialAccountDTO {
    id:       number
    name:     string
    url:      string
    imageUrl: string | null
}