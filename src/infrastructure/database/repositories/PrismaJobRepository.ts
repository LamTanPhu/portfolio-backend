import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { IJobReadRepository } from '../../../domain/repositories/job/IJobReadRepository'
import { Job } from '../../../domain/entities/Job'

type PrismaJob = Prisma.JobGetPayload<Record<string, never>>

// =============================================================================
// PrismaJobRepository
// Read-only — work experience managed via seed or admin.
// Ordered by startedAt descending — most recent role shown first.
// =============================================================================
@Injectable()
export class PrismaJobRepository implements IJobReadRepository {
    constructor(private readonly prisma: PrismaService) {}

    private static toDomain(raw: PrismaJob): Job {
        return new Job(
            raw.id,
            raw.companyName,
            raw.role,
            raw.startedAt,
            raw.endedAt,
            raw.isEnded,
            raw.userId,
            raw.createdAt,
            raw.updatedAt,
        )
    }

    async findAll(): Promise<Job[]> {
        const rows = await this.prisma.client.job.findMany({
            orderBy: { startedAt: 'desc' },
        })
        return rows.map(PrismaJobRepository.toDomain)
    }
}