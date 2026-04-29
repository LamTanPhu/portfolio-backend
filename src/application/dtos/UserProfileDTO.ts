// =============================================================================
// UserProfileDTO
// Output shape for authenticated admin profile.
// hashPassword excluded — never returned from any endpoint.
// =============================================================================
export interface UserProfileDTO {
    id:        number
    firstname: string
    lastname:  string
    email:     string
    aboutme:   string | null
    lastLogin: string | null
}