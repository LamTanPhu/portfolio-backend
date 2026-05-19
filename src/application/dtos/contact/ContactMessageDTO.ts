// =============================================================================
// ContactMessageDTO
// Admin-only shape — includes IP and browser info for spam analysis.
// Never exposed on public endpoints.
// =============================================================================
export interface ContactMessageDTO {
    id:          number
    name:        string
    email:       string
    message:     string
    ipAddress:   string
    browserInfo: string | null
    createdAt:   string
}