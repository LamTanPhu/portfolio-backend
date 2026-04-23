// =============================================================================
// JobDTO
// Output shape for work experience entries.
// Dates serialized as ISO 8601 strings — domain Date objects never cross layers.
// endedAt null = currently employed at this company.
// =============================================================================
export interface JobDTO {
    id:          number
    companyName: string
    role:        string
    startedAt:   string
    endedAt:     string | null
    isEnded:     boolean
}