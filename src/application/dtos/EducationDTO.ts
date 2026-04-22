// =============================================================================
// EducationDTO
// Dates serialized as ISO strings — domain Date objects never cross boundaries.
// =============================================================================
export interface EducationDTO {
    id:            number
    degreeName:    string
    instituteName: string
    instituteUrl:  string | null
    startedAt:     string
    endedAt:       string | null
    isCompleted:   boolean
}