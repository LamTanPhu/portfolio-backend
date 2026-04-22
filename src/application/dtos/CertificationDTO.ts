// =============================================================================
// CertificationDTO
// Output shape for published certifications.
// =============================================================================
export interface CertificationDTO {
    id:        number
    name:      string
    url:       string
    startDate: string
    endDate:   string | null
}