import type { TransactionalClient } from './IUnitOfWork'

// =============================================================================
// ITokenRepository
// Application port for JWT revocation blacklist storage.
// AuthService depends on this interface — never on Prisma directly.
// Infrastructure layer (PrismaRevokedTokenRepository) implements this.
// deleteExpired() called by TokenCleanupTask — scheduled cron, not hot path.
//
// revoke() accepts an optional `tx` (transactional client) — used by
// AuthService.logout() to atomically revoke both the access and refresh
// token in a single transaction. When omitted, runs on the global client
// as before (e.g. the single revoke() call in refresh()).
// =============================================================================
export interface ITokenRepository {
    revoke(jti: string, expiresAt: Date, tx?: TransactionalClient): Promise<void>
    isRevoked(jti: string): Promise<boolean>
    deleteExpired(): Promise<void>
}
