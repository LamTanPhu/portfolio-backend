/**
 * @fileoverview PrismaJobMapper
 *
 * Converts Prisma Job model → Domain Job entity.
 * Centralized mapper to avoid duplication between Read and Write repositories.
 */

import { Prisma } from '@prisma/client'
import { Job } from '../../../domain/entities/Job'

type PrismaJob = Prisma.JobGetPayload<Record<string, never>>

export class PrismaJobMapper {
    static toDomain(raw: PrismaJob): Job {
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
}