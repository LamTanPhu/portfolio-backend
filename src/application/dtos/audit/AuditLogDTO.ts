// =============================================================================
// AuditLogDTO
// Admin-only shape — never exposed on public endpoints.
// =============================================================================
export interface AuditLogDTO {
    id: number
    actorId: number | null
    method: string
    route: string
    entityType: string
    entityId: string | null
    ipAddress: string | null
    statusCode: number
    createdAt: string
}
