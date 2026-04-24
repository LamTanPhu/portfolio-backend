import type { User } from '../../entities/User'

// =============================================================================
// IUserReadRepository
// Read interface for User aggregate.
// hashPassword never included in domain User — excluded at repository level.
// findById used for profile queries.
// findByEmail used for auth lookups — email has unique index, O(1).
// =============================================================================
export interface IUserReadRepository {
    findById(id: number): Promise<User | null>
    findByEmail(email: string): Promise<User | null>
}