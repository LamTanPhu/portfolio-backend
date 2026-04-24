import type { User } from '../../entities/User'

// =============================================================================
// UpdateUserInput
// All fields optional — PATCH semantics.
// email and hashPassword intentionally excluded — never updated via domain.
// lastLogin updated on each successful auth — controlled by AuthService.
// =============================================================================
export interface UpdateUserInput {
    firstname?: string
    lastname?:  string
    aboutme?:   string | null
    lastLogin?: Date
}

// =============================================================================
// IUserWriteRepository
// Write interface for User aggregate — separated from read per ISP.
// No create — user seeded once, never created via API.
// No delete — portfolio has one permanent admin user.
// =============================================================================
export interface IUserWriteRepository {
    update(id: number, data: UpdateUserInput): Promise<User>
}