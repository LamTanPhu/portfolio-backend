import type { Job } from '../../entities/Job'

// =============================================================================
// CreateJobInput
// userId from verified JWT payload — never accepted from client.
// endedAt null = currently employed at this company.
// =============================================================================
export interface CreateJobInput {
    companyName: string
    role:        string
    startedAt:   Date
    endedAt:     Date | null
    isEnded:     boolean
    userId:      number
}

// =============================================================================
// UpdateJobInput
// All fields optional — PATCH semantics.
// =============================================================================
export interface UpdateJobInput {
    companyName?: string
    role?:        string
    startedAt?:   Date
    endedAt?:     Date | null
    isEnded?:     boolean
}

// =============================================================================
// IJobWriteRepository
// Write interface for Job aggregate — separated from read per ISP.
// =============================================================================
export interface IJobWriteRepository {
    create(data: CreateJobInput): Promise<Job>
    update(id: number, data: UpdateJobInput): Promise<Job>
    delete(id: number): Promise<void>
}