/**
 * @fileoverview PrismaCertificationReadRepository
 */

import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { ICertificationReadRepository } from '../../../../domain/repositories/certification/ICertificationReadRepository'
import { PrismaService } from '../../prisma/prisma.service'
import { CertificationDTO } from '../../../../application/dtos/certification/CertificationDTO'

@Injectable()
export class PrismaCertificationReadRepository implements ICertificationReadRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findPublished(): Promise<CertificationDTO[]> {
        const rows = await this.prisma.client.certification.findMany({
            where: { isPublished: true },
            orderBy: { startDate: 'desc' },
            select: {
                id: true,
                name: true,
                url: true,
                startDate: true,
                endDate: true,
            },
        })

        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            url: row.url,
            startDate: row.startDate.toISOString(),
            endDate: row.endDate?.toISOString() ?? null,
        }))
    }
}
