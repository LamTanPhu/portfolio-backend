import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../../infrastructure/database/prisma/prisma.service'

export interface EducationDTO {
    id: number
    degreeName: string
    instituteName: string
    instituteUrl: string | null
    startedAt: string
    endedAt: string | null
    isCompleted: boolean
}

@Injectable()
export class GetEducationQuery {
    constructor(private readonly prisma: PrismaService) {}

    async execute(): Promise<EducationDTO[]> {
        const rows = await this.prisma.client.education.findMany({
        orderBy: { startedAt: 'desc' },
        })
        return rows.map((r) => ({
        id: r.id,
        degreeName: r.degreeName,
        instituteName: r.instituteName,
        instituteUrl: r.instituteUrl,
        startedAt: r.startedAt.toISOString(),
        endedAt: r.endedAt?.toISOString() ?? null,
        isCompleted: r.isCompleted,
        }))
    }
}