// =============================================================================
// Application port for token revocation storage.
// Use cases depend on this interface — never on Prisma directly.
// =============================================================================
export interface ITokenRepository {
    revoke(jti: string, expiresAt: Date): Promise<void>
    isRevoked(jti: string): Promise<boolean>
    deleteExpired(): Promise<void>
}