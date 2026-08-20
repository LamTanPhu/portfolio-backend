// =============================================================================
// IAuditLogReadRepository
// Read interface for AuditLog aggregate — admin use only.
// Mirrors IContactReadRepository's cursor pagination shape for consistency.
// =============================================================================

import { AuditLog } from "../../entities/AuditLog"

export interface AuditLogPage {
    items:      AuditLog[]
    nextCursor: number | null
    total:      number
}

export interface IAuditLogReadRepository {
    /**
     * Returns a page of audit log entries, newest first.
     * cursor: return entries with id < cursor (i.e. older than the last seen row).
     * limit:  max rows to return — defaults to 20, capped at 100.
     */
    findPaginated(cursor?: number, limit?: number): Promise<AuditLogPage>
}
