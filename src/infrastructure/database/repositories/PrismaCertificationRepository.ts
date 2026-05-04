import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { ICertificationReadRepository } from '../../../domain/repositories/certification/ICertificationReadRepository'
import type {
  ICertificationWriteRepository,
  CreateCertificationInput,
  UpdateCertificationInput,
} from '../../../domain/repositories/certification/ICertificationWriteRepository'
import { Certification } from '../../../domain/entities/Certification'
import { NotFoundError } from '../../../domain/errors/NotFoundError'

type PrismaCertification = Prisma.CertificationGetPayload<Record<string, never>>

// =============================================================================
// PrismaCertificationRepository
// Implements both read and write interfaces for Certification aggregate.
// Write operations catch P2025 — eliminates read-before-write round trip.
// O(1) update/delete — single query instead of findById + mutate.
// =============================================================================
@Injectable()
export class PrismaCertificationRepository
    implements ICertificationReadRepository, ICertificationWriteRepository
    {
    constructor(private readonly prisma: PrismaService) {}

    // ===========================================================================
    // Mapper — Prisma model → Domain entity
    // ===========================================================================
    private static toDomain(raw: PrismaCertification): Certification {
        return new Certification(
        raw.id,
        raw.name,
        raw.url,
        raw.isPublished,
        raw.startDate,
        raw.endDate,
        raw.userId,
        raw.createdAt,
        raw.updatedAt,
        )
    }

    // ===========================================================================
    // Read Operations
    // ===========================================================================
    // O(n) — filtered by isPublished index, ordered by startDate desc
    async findPublished(): Promise<Certification[]> {
        const rows = await this.prisma.client.certification.findMany({
        where:   { isPublished: true },
        orderBy: { startDate: 'desc' },
        })
        return rows.map(PrismaCertificationRepository.toDomain)
    }

    // ===========================================================================
    // Write Operations
    // P2025 caught at repository level — use cases stay clean of Prisma knowledge
    // ===========================================================================

    async create(data: CreateCertificationInput): Promise<Certification> {
        const row = await this.prisma.client.certification.create({ data })
        return PrismaCertificationRepository.toDomain(row)
    }

    async update(id: number, data: UpdateCertificationInput): Promise<Certification> {
        try {
        const row = await this.prisma.client.certification.update({
            where: { id },
            data,
        })
        return PrismaCertificationRepository.toDomain(row)
        } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new NotFoundError(`Certification not found: ${id}`)
        }
        throw error
        }
    }

    async delete(id: number): Promise<void> {
        try {
        await this.prisma.client.certification.delete({ where: { id } })
        } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new NotFoundError(`Certification not found: ${id}`)
        }
        throw error
        }
    }
}