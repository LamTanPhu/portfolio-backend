// =============================================================================
// AuditLog
// Write-only recent-activity trail for admin write actions.
// No before/after payload by design — see schema.prisma comment on AuditLog:
// 47-day retention makes diff storage pointless (purged before it'd be useful).
// actorId nullable — defensive only; every write route requires JwtAuthGuard,
// so in practice this is always populated.
// =============================================================================
export class AuditLog {
    constructor(
        public readonly id: number,
        public readonly actorId: number | null,
        public readonly method: string,
        public readonly route: string,
        public readonly entityType: string,
        public readonly entityId: string | null,
        public readonly ipAddress: string | null,
        public readonly statusCode: number,
        public readonly createdAt: Date,
    ) {}
}
