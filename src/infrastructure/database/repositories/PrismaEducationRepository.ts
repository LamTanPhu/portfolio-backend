import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Education } from '../../../domain/entities/Education'
import { NotFoundError } from '../../../domain/errors/NotFoundError'
import type { IEducationReadRepository } from '../../../domain/repositories/education/IEducationReadRepository'
import type {
    CreateEducationInput,
    IEducationWriteRepository,
    UpdateEducationInput,
} from '../../../domain/repositories/education/IEducationWriteRepository'
import { PrismaService } from '../prisma/prisma.service'

type PrismaEducation = Prisma.EducationGetPayload<Record<string, never>>

// =============================================================================
// PrismaEducationRepository
// Implements both read and write interfaces for Education aggregate.
// Write operations catch P2025 — eliminates read-before-write round trip.
// O(1) update/delete — single query instead of findById + mutate.
// =============================================================================
@Injectable()
export class PrismaEducationRepository
    implements IEducationReadRepository, IEducationWriteRepository
    {
    constructor(private readonly prisma: PrismaService) {}

    // ===========================================================================
    // Mapper — Prisma model → Domain entity
    // ===========================================================================
    private static toDomain(raw: PrismaEducation): Education {
        return new Education(
        raw.id,
        raw.degreeName,
        raw.instituteName,
        raw.instituteUrl,
        raw.startedAt,
        raw.endedAt,
        raw.isCompleted,
        raw.userId,
        raw.createdAt,
        raw.updatedAt,
        )
    }

    // ===========================================================================
    // Read Operations
    // ===========================================================================

    // O(n) — ordered by startedAt desc, no filter
    async findAll(): Promise<Education[]> {
        const rows = await this.prisma.client.education.findMany({
        orderBy: { startedAt: 'desc' },
        })
        return rows.map(PrismaEducationRepository.toDomain)
    }

    // ===========================================================================
    // Write Operations
    // P2025 caught at repository level — use cases stay clean of Prisma knowledge
    // ===========================================================================

    async create(data: CreateEducationInput): Promise<Education> {
        const row = await this.prisma.client.education.create({ data })
        return PrismaEducationRepository.toDomain(row)
    }

    async update(id: number, data: UpdateEducationInput): Promise<Education> {
        try {
        const row = await this.prisma.client.education.update({
            where: { id },
            data,
        })
        return PrismaEducationRepository.toDomain(row)
        } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new NotFoundError(`Education not found: ${id}`)
        }
        throw error
        }
    }

    async delete(id: number): Promise<void> {
        try {
        await this.prisma.client.education.delete({ where: { id } })
        } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new NotFoundError(`Education not found: ${id}`)
        }
        throw error
        }
    }
}