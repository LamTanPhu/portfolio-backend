import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { ICertificationReadRepository } from '../../../domain/repositories/certification/ICertificationReadRepository'
import { Certification } from '../../../domain/entities/Certification'

type PrismaCertification = Prisma.CertificationGetPayload<Record<string, never>>

// =============================================================================
// PrismaCertificationRepository
// Read-only — certifications managed via seed or admin.
// findPublished filters by isPublished index — draft certs never exposed.
// Ordered by startDate descending — most recent certification shown first.
// =============================================================================
@Injectable()
export class PrismaCertificationRepository implements ICertificationReadRepository {
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

  // O(n) — filtered by isPublished index, ordered by startDate desc
    async findPublished(): Promise<Certification[]> {
        const rows = await this.prisma.client.certification.findMany({
        where:   { isPublished: true },
        orderBy: { startDate: 'desc' },
        })
        return rows.map(PrismaCertificationRepository.toDomain)
    }
}