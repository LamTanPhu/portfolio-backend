// =============================================================================
// IAuditLogWriteRepository
// Write interface for AuditLog aggregate.
// save() called by AuditLogInterceptor on every successful admin mutation.
// deleteOlderThan() called by DataRetentionTask — scheduled cron, not hot path.
// Separated from IAuditLogReadRepository per Interface Segregation Principle.
// =============================================================================
export interface AuditLogEntry {
    actorId:    number | null
    method:     string
    route:      string
    entityType: string
    entityId:   string | null
    ipAddress:  string | null
    statusCode: number
}

export interface IAuditLogWriteRepository {
    save(entry: AuditLogEntry): Promise<void>

    /** Deletes every row with createdAt older than `cutoff`. */
    deleteOlderThan(cutoff: Date): Promise<void>
}
