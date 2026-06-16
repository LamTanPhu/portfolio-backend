// =============================================================================
// IAdminCredentialRepository
//
// Purpose: Auth-only interface that exposes the hashed password for login
// verification. Deliberately separated from IUserReadRepository, which
// never returns hashPassword.
//
// Single Responsibility:
//   IUserReadRepository  — profile data, never credentials
//   IAdminCredentialRepository — auth path only, returns minimal credential shape
//
// Only AuthService depends on this interface.
// No other use case or query should ever touch this port.
// =============================================================================

export interface AdminCredential {
    /** Database user ID — passed to token issuer after auth success */
    id: number

    /** bcrypt hash stored in DB by the seed script — NEVER the raw password */
    hashPassword: string
}

export interface IAdminCredentialRepository {
    /**
     * Fetches id + hashPassword for the given email.
     * Returns null if no user exists with that email (auth should treat this
     * identically to a wrong password — never reveal which field is wrong).
     */
    findCredentialByEmail(email: string): Promise<AdminCredential | null>
}