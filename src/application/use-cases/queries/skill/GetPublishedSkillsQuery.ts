import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service'

export interface SkillDTO {
    id: number
    name: string
    imageUrl: string | null
    category: string
}

@Injectable()
export class GetPublishedSkillsQuery {
    constructor(private readonly prisma: PrismaService) {}

    async execute(): Promise<SkillDTO[]> {
        const rows = await this.prisma.client.skill.findMany({
        where: { isPublic: true },
        orderBy: { category: 'asc' },
        })
        return rows.map((r) => ({
        id: r.id,
        name: r.name,
        imageUrl: r.imageUrl,
        category: r.category,
        }))
    }
}