import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { IPageViewRepository } from '../../../domain/repositories/analytics/IPageViewRepository'
import { PageView } from '../../../domain/entities/PageView'

// =============================================================================
// PrismaPageViewRepository
// Upsert pattern — single query handles both first visit and subsequent visits.
// No race condition risk — PostgreSQL upsert is atomic.
// count ordered descending — most viewed routes shown first in admin.
// =============================================================================
@Injectable()
export class PrismaPageViewRepository implements IPageViewRepository {
    constructor(private readonly prisma: PrismaService) {}

    // O(1) — upsert on route unique index
    async increment(route: string): Promise<void> {
        await this.prisma.client.pageView.upsert({
        where:  { route },
        update: { count: { increment: 1 } },
        create: { route, count: 1 },
        })
    }

    // O(1) — route has @unique index
    async findByRoute(route: string): Promise<PageView | null> {
        const row = await this.prisma.client.pageView.findUnique({
        where: { route },
        })
        return row
        ? new PageView(row.id, row.route, row.count, row.lastViewedAt)
        : null
    }

    // O(n) — ordered by count desc, no filter
    async findAll(): Promise<PageView[]> {
        const rows = await this.prisma.client.pageView.findMany({
        orderBy: { count: 'desc' },
        })
        return rows.map((r) => new PageView(r.id, r.route, r.count, r.lastViewedAt))
    }
}