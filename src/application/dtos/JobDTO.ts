// =============================================================================
// JobDTO
// Output shape for work experience entries.
// =============================================================================
export interface JobDTO {
    id:          number
    companyName: string
    role:        string
    startedAt:   string
    endedAt:     string | null
    isEnded:     boolean
}