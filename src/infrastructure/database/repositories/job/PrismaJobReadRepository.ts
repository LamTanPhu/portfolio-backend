/**
 * @fileoverview PrismaJobReadRepository
 * Read-only repository for Job aggregate.
 */

import { Injectable } from '@nestjs/common'
import type { IJobReadRepository } from '../../../../domain/repositories/job/IJobReadRepository'
import { PrismaService } from '../../prisma/prisma.service'
import { PrismaJobMapper } from '../../mappers/PrismaJobMapper'
import { Job } from '../../../../domain/entities/Job'
import { JobDTO } from '../../../../application/dtos/JobDTO'

@Injectable()
export class PrismaJobReadRepository implements IJobReadRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(): Promise<JobDTO[]> {
        const rows = await this.prisma.client.job.findMany({
            orderBy: { startedAt: 'desc' },
            select: {
                id: true,
                companyName: true,
                role: true,
                startedAt: true,
                endedAt: true,
                isEnded: true,
            },
        })

        return rows.map((row) => ({
            id: row.id,
            companyName: row.companyName,
            role: row.role,
            startedAt: row.startedAt.toISOString(),
            endedAt: row.endedAt?.toISOString() ?? null,
            isEnded: row.isEnded,
        }))
    }

    async findById(id: number): Promise<Job | null> {
        const row = await this.prisma.client.job.findUnique({ where: { id } })
        return row ? PrismaJobMapper.toDomain(row) : null
    }
}
