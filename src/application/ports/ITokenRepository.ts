// =============================================================================
// ITokenRepository
// Application port for JWT revocation blacklist storage.
// AuthService depends on this interface — never on Prisma directly.
// Infrastructure layer (PrismaRevokedTokenRepository) implements this.
// deleteExpired() called by TokenCleanupTask — scheduled cron, not hot path.
// =============================================================================
export interface ITokenRepository {
    revoke(jti: string, expiresAt: Date): Promise<void>
    isRevoked(jti: string): Promise<boolean>
    deleteExpired(): Promise<void>
}