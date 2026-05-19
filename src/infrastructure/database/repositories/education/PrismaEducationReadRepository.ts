/**
 * @fileoverview PrismaEducationReadRepository
 * Read-only repository for Education records.
 */

import { Injectable } from '@nestjs/common'
import { EducationDTO } from '../../../../application/dtos/education/EducationDTO'
import type { IEducationReadRepository } from '../../../../domain/repositories/education/IEducationReadRepository'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class PrismaEducationReadRepository implements IEducationReadRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(): Promise<EducationDTO[]> {
        const rows = await this.prisma.client.education.findMany({
        orderBy: { startedAt: 'desc' },
        select: {
            id:            true,
            degreeName:    true,
            instituteName: true,
            instituteUrl:  true,
            startedAt:     true,
            endedAt:       true,
            isCompleted:   true,
        },
        })

        return rows.map(row => ({
        id:            row.id,
        degreeName:    row.degreeName,
        instituteName: row.instituteName,
        instituteUrl:  row.instituteUrl,
        startedAt:     row.startedAt.toISOString(),
        endedAt:       row.endedAt?.toISOString() ?? null,
        isCompleted:   row.isCompleted,
        }))
    }
}