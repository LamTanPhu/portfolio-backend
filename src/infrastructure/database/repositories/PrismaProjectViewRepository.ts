import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { IProjectViewRepository } from '../../../domain/repositories/project/IProjectViewRepository'
import { ProjectView } from '../../../domain/entities/ProjectView'

type PrismaProjectView = Prisma.ProjectViewGetPayload<Record<string, never>>

// =============================================================================
// PrismaProjectViewRepository
// Daily bucketed view counting — one row per project per day.
// increment() uses upsert — atomic, no race condition, O(1) always.
// getTotalViews() uses aggregate — single DB query, no app-level summing.
// =============================================================================
@Injectable()
export class PrismaProjectViewRepository implements IProjectViewRepository {
    constructor(private readonly prisma: PrismaService) {}

    private static toDomain(raw: PrismaProjectView): ProjectView {
        return new ProjectView(
        raw.id,
        raw.projectId,
        raw.date,
        raw.count,
        raw.createdAt,
        raw.updatedAt,
        )
    }

    // O(1) — upsert on composite unique index [projectId, date]
    // Increments today's counter or creates a new row for today
    async increment(projectId: number): Promise<void> {
        // Normalize to midnight UTC — ensures consistent daily bucketing
        const today = new Date()
        today.setUTCHours(0, 0, 0, 0)

        await this.prisma.client.projectView.upsert({
        where:  { projectId_date: { projectId, date: today } },
        update: { count: { increment: 1 } },
        create: { projectId, date: today, count: 1 },
        })
    }

    // Single aggregate query — never fetch all rows to sum in application
    async getTotalViews(projectId: number): Promise<number> {
        const result = await this.prisma.client.projectView.aggregate({
        where: { projectId },
        _sum:  { count: true },
        })
        return result._sum.count ?? 0
    }

    // Returns all daily records — frontend can chart views over time
    async findByProject(projectId: number): Promise<ProjectView[]> {
        const rows = await this.prisma.client.projectView.findMany({
        where:   { projectId },
        orderBy: { date: 'desc' },
        })
        return rows.map(PrismaProjectViewRepository.toDomain)
    }
}