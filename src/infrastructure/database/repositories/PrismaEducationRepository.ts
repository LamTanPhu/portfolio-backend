import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { IEducationReadRepository } from '../../../domain/repositories/education/IEducationReadRepository'
import { Education } from '../../../domain/entities/Education'

type PrismaEducation = Prisma.EducationGetPayload<Record<string, never>>

// =============================================================================
// PrismaEducationRepository
// Read-only — education records managed via seed or admin.
// Ordered by startedAt descending — most recent degree shown first.
// =============================================================================
@Injectable()
export class PrismaEducationRepository implements IEducationReadRepository {
    constructor(private readonly prisma: PrismaService) {}

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

    async findAll(): Promise<Education[]> {
        const rows = await this.prisma.client.education.findMany({
            orderBy: { startedAt: 'desc' },
        })
        return rows.map(PrismaEducationRepository.toDomain)
    }
}