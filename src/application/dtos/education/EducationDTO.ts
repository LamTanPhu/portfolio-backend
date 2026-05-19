// =============================================================================
// EducationDTO
// Output shape for education records.
// Dates serialized as ISO 8601 strings — domain Date objects never cross layers.
// endedAt null = currently enrolled.
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