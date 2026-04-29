import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Job } from '../../../domain/entities/Job'
import { NotFoundError } from '../../../domain/errors/NotFoundError'
import type { IJobReadRepository } from '../../../domain/repositories/job/IJobReadRepository'
import type {
    CreateJobInput,
    IJobWriteRepository,
    UpdateJobInput,
} from '../../../domain/repositories/job/IJobWriteRepository'
import { PrismaService } from '../prisma/prisma.service'

type PrismaJob = Prisma.JobGetPayload<Record<string, never>>

// =============================================================================
// PrismaJobRepository
// Implements both read and write interfaces for Job aggregate.
// Write operations catch P2025 — eliminates read-before-write round trip.
// O(1) update/delete — single query instead of findById + mutate.
// =============================================================================
@Injectable()
export class PrismaJobRepository
    implements IJobReadRepository, IJobWriteRepository
    {
    constructor(private readonly prisma: PrismaService) {}

    // ===========================================================================
    // Mapper — Prisma model → Domain entity
    // ===========================================================================
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

    // ===========================================================================
    // Read Operations
    // ===========================================================================

    // O(n) — ordered by startedAt desc, no filter
    async findAll(): Promise<Job[]> {
        const rows = await this.prisma.client.job.findMany({
        orderBy: { startedAt: 'desc' },
        })
        return rows.map(PrismaJobRepository.toDomain)
    }

    // ===========================================================================
    // Write Operations
    // P2025 caught at repository level — use cases stay clean of Prisma knowledge
    // ===========================================================================

    async create(data: CreateJobInput): Promise<Job> {
        const row = await this.prisma.client.job.create({ data })
        return PrismaJobRepository.toDomain(row)
    }

    async update(id: number, data: UpdateJobInput): Promise<Job> {
        try {
        const row = await this.prisma.client.job.update({ where: { id }, data })
        return PrismaJobRepository.toDomain(row)
        } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new NotFoundError(`Job not found: ${id}`)
        }
        throw error
        }
    }

    async delete(id: number): Promise<void> {
        try {
        await this.prisma.client.job.delete({ where: { id } })
        } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new NotFoundError(`Job not found: ${id}`)
        }
        throw error
        }
    }
}