/**
 * @fileoverview PrismaAuditLogRepository
 *
 * Implements both IAuditLogWriteRepository and IAuditLogReadRepository.
 * Same one-class-two-tokens pattern as PrismaContactRepository.
 *
 * No batching on deleteOlderThan() — unlike PrismaRevokedTokenRepository,
 * audit log volume for a single-admin app is a handful of rows per active
 * day. A 47-day window will never accumulate enough rows to justify batched
 * deletion; a single deleteMany() is simpler and correct at this scale.
 */

import { Injectable } from '@nestjs/common'
import { AuditLog } from '../../../../domain/entities/AuditLog'
import type {
    IAuditLogWriteRepository,
    AuditLogEntry,
} from '../../../../domain/repositories/audit/IAuditLogWriteRepository'
import type {
    IAuditLogReadRepository,
    AuditLogPage,
} from '../../../../domain/repositories/audit/IAuditLogReadRepository'
import { PrismaService } from '../../prisma/prisma.service'

const AUDIT_LOG_SELECT = {
    id: true,
    actorId: true,
    method: true,
    route: true,
    entityType: true,
    entityId: true,
    ipAddress: true,
    statusCode: true,
    createdAt: true,
} as const

@Injectable()
export class PrismaAuditLogRepository implements IAuditLogWriteRepository, IAuditLogReadRepository {
    constructor(private readonly prisma: PrismaService) {}

    // ──────────────────────────────────────────────────────────────────────────
    // Private mapper — single source of truth for AuditLog construction
    // ──────────────────────────────────────────────────────────────────────────

    private static toDomain(row: {
        id: number
        actorId: number | null
        method: string
        route: string
        entityType: string
        entityId: string | null
        ipAddress: string | null
        statusCode: number
        createdAt: Date
    }): AuditLog {
        return new AuditLog(
            row.id,
            row.actorId,
            row.method,
            row.route,
            row.entityType,
            row.entityId,
            row.ipAddress,
            row.statusCode,
            row.createdAt,
        )
    }

    // ──────────────────────────────────────────────────────────────────────────
    // IAuditLogWriteRepository
    // ──────────────────────────────────────────────────────────────────────────

    // O(1) — insert, PK auto-generated.
    // Called from AuditLogInterceptor's tap() — must never throw into the
    // request/response cycle. Interceptor is responsible for catching; this
    // method stays a plain passthrough so failures are visible in tests.
    async save(entry: AuditLogEntry): Promise<void> {
        await this.prisma.client.auditLog.create({
            data: {
                actorId: entry.actorId,
                method: entry.method,
                route: entry.route,
                entityType: entry.entityType,
                entityId: entry.entityId,
                ipAddress: entry.ipAddress,
                statusCode: entry.statusCode,
                // createdAt set by DB default — never trust application-layer timestamps
            },
        })
    }

    // Single deleteMany — see file header for why no batching at this scale.
    // Called on a schedule (daily, via DataRetentionTask) — not on hot path.
    async deleteOlderThan(cutoff: Date): Promise<void> {
        await this.prisma.client.auditLog.deleteMany({
            where: { createdAt: { lt: cutoff } },
        })
    }

    // ──────────────────────────────────────────────────────────────────────────
    // IAuditLogReadRepository
    // ──────────────────────────────────────────────────────────────────────────

    // Cursor-based pagination — O(log n) via PK index scan.
    // Fetches `limit` rows with id < cursor (newest first).
    async findPaginated(cursor?: number, limit = 20): Promise<AuditLogPage> {
        const take = Math.min(Math.max(1, limit), 100) // clamp: 1–100

        const [rows, total] = await Promise.all([
            this.prisma.client.auditLog.findMany({
                select: AUDIT_LOG_SELECT,
                where: cursor ? { id: { lt: cursor } } : undefined,
                orderBy: { id: 'desc' }, // PK desc = newest first, uses PK index
                take,
            }),
            this.prisma.client.auditLog.count(),
        ])

        const items = rows.map((row) => PrismaAuditLogRepository.toDomain(row))
        const nextCursor = rows.length === take ? rows[rows.length - 1].id : null

        return { items, nextCursor, total }
    }
}
