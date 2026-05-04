import type { Certification } from '../../entities/Certification'

// =============================================================================
// CreateCertificationInput
// userId from verified JWT payload — never accepted from client.
// endDate null = no expiry / lifetime certification.
// =============================================================================
export interface CreateCertificationInput {
    name:        string
    url:         string
    isPublished: boolean
    startDate:   Date
    endDate:     Date | null
    userId:      number
}

// =============================================================================
// UpdateCertificationInput
// All fields optional — PATCH semantics.
// =============================================================================
export interface UpdateCertificationInput {
    name?:        string
    url?:         string
    isPublished?: boolean
    startDate?:   Date
    endDate?:     Date | null
}

// =============================================================================
// ICertificationWriteRepository
// Write interface for Certification aggregate — separated from read per ISP.
// =============================================================================
export interface ICertificationWriteRepository {
    create(data: CreateCertificationInput): Promise<Certification>
    update(id: number, data: UpdateCertificationInput): Promise<Certification>
    delete(id: number): Promise<void>
}