/**
 * @fileoverview GetAuditLogsQuery
 *
 * Admin-only query returning recent admin activity, paginated.
 * Not cached — this is a low-traffic admin-only read (you, checking recent
 * activity), and caching it risks showing stale results right after an
 * action you just took. Contact messages cache because they're read far
 * more often than they change; audit logs are the opposite.
 */

import { Inject, Injectable } from '@nestjs/common'
import type { IAuditLogReadRepository } from '../../../../domain/repositories/audit/IAuditLogReadRepository'
import type { AuditLogDTO } from '../../../dtos/audit/AuditLogDTO'

export interface AuditLogPageDTO {
    items:      AuditLogDTO[]
    nextCursor: number | null
    total:      number
}

@Injectable()
export class GetAuditLogsQuery {
    constructor(
        @Inject('IAuditLogReadRepository')
        private readonly repo: IAuditLogReadRepository,
    ) {}

    async execute(cursor?: number, limit?: number): Promise<AuditLogPageDTO> {
        const page = await this.repo.findPaginated(cursor, limit)

        return {
            items: page.items.map((entry) => ({
                id:         entry.id,
                actorId:    entry.actorId,
                method:     entry.method,
                route:      entry.route,
                entityType: entry.entityType,
                entityId:   entry.entityId,
                ipAddress:  entry.ipAddress,
                statusCode: entry.statusCode,
                createdAt:  entry.createdAt.toISOString(),
            })),
            nextCursor: page.nextCursor,
            total:      page.total,
        }
    }
}
