import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../../infrastructure/database/prisma/prisma.service'

export interface CertificationDTO {
    id: number
    name: string
    url: string
    startDate: string
    endDate: string | null
}

@Injectable()
export class GetCertificationsQuery {
    constructor(private readonly prisma: PrismaService) {}

    async execute(): Promise<CertificationDTO[]> {
        const rows = await this.prisma.client.certification.findMany({
        where: { isPublished: true },
        orderBy: { startDate: 'desc' },
        })
        return rows.map((r) => ({
        id: r.id,
        name: r.name,
        url: r.url,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate?.toISOString() ?? null,
        }))
    }
}