/**
 * @fileoverview PrismaSkillReadRepository
 * Read-only repository for Skill aggregate.
 */

import { Injectable } from '@nestjs/common'
import type { ISkillReadRepository } from '../../../../domain/repositories/skill/ISkillReadRepository'
import type { SkillDTO } from '../../../../application/dtos/SkillDTO'
import { PrismaService } from '../../prisma/prisma.service'
import { PrismaSkillMapper } from '../../mappers/PrismaSkillMapper'
import { Skill } from '../../../../domain/entities/Skill'

@Injectable()
export class PrismaSkillReadRepository implements ISkillReadRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findPublished(): Promise<SkillDTO[]> {
        const rows = await this.prisma.client.skill.findMany({
            where: { isPublic: true },
            orderBy: { category: 'asc' },
            select: {
                id: true,
                name: true,
                imageUrl: true,
                category: true,
                isPublic: true,
            },
        })

        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            imageUrl: row.imageUrl,
            category: row.category,
            isPublic: row.isPublic,
        }))
    }

    async findAll(): Promise<SkillDTO[]> {
        const rows = await this.prisma.client.skill.findMany({
            orderBy: { category: 'asc' },
            select: {
                id: true,
                name: true,
                imageUrl: true,
                category: true,
                isPublic: true,
            },
        })

        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            imageUrl: row.imageUrl,
            category: row.category,
            isPublic: row.isPublic,
        }))
    }

    async findById(id: number): Promise<Skill | null> {
        const row = await this.prisma.client.skill.findUnique({ where: { id } })
        return row ? PrismaSkillMapper.toDomain(row) : null
    }
}
