import type { Education } from '../../entities/Education'

// =============================================================================
// CreateEducationInput
// userId from verified JWT payload — never accepted from client.
// =============================================================================
export interface CreateEducationInput {
    degreeName:    string
    instituteName: string
    instituteUrl:  string | null
    startedAt:     Date
    endedAt:       Date | null
    isCompleted:   boolean
    userId:        number
}

// =============================================================================
// UpdateEducationInput
// All fields optional — PATCH semantics.
// =============================================================================
export interface UpdateEducationInput {
    degreeName?:    string
    instituteName?: string
    instituteUrl?:  string | null
    startedAt?:     Date
    endedAt?:       Date | null
    isCompleted?:   boolean
}

// =============================================================================
// IEducationWriteRepository
// Write interface for Education aggregate — separated from read per ISP.
// =============================================================================
export interface IEducationWriteRepository {
    create(data: CreateEducationInput): Promise<Education>
    update(id: number, data: UpdateEducationInput): Promise<Education>
    delete(id: number): Promise<void>
}