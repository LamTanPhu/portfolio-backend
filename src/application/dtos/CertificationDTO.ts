// =============================================================================
// CertificationDTO
// Output shape for published certifications.
// Dates serialized as ISO 8601 strings — domain Date objects never cross layers.
// endDate null = no expiry / lifetime certification.
// =============================================================================
export interface CertificationDTO {
    id:        number
    name:      string
    url:       string
    startDate: string
    endDate:   string | null
}