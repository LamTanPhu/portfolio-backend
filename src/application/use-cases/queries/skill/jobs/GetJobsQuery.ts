import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../../infrastructure/database/prisma/prisma.service'

export interface JobDTO {
    id: number
    companyName: string
    role: string
    startedAt: string
    endedAt: string | null
    isEnded: boolean
}

@Injectable()
export class GetJobsQuery {
    constructor(private readonly prisma: PrismaService) {}

    async execute(): Promise<JobDTO[]> {
        const rows = await this.prisma.client.job.findMany({
        orderBy: { startedAt: 'desc' },
        })
        return rows.map((r) => ({
        id: r.id,
        companyName: r.companyName,
        role: r.role,
        startedAt: r.startedAt.toISOString(),
        endedAt: r.endedAt?.toISOString() ?? null,
        isEnded: r.isEnded,
        }))
    }
}