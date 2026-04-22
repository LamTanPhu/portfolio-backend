import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { Certification } from '../../../domain/entities/Certification'
import type { ICertificationReadRepository } from '../../../domain/repositories/certification/ICertificationReadRepository'
import { PrismaService } from '../prisma/prisma.service'

type PrismaCertification = Prisma.CertificationGetPayload<Record<string, never>>

// =============================================================================
// PrismaCertificationRepository
// Read-only — certifications managed via seed or admin.
// Only published certifications returned — isPublished filter applied.
// Ordered by startDate descending — most recent cert shown first.
// =============================================================================
@Injectable()
export class PrismaCertificationRepository implements ICertificationReadRepository {
    constructor(private readonly prisma: PrismaService) {}

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

    async findPublished(): Promise<Certification[]> {
        const rows = await this.prisma.client.certification.findMany({
            where:   { isPublished: true },
            orderBy: { startDate: 'desc' },
        })
        return rows.map(PrismaCertificationRepository.toDomain)
    }
}