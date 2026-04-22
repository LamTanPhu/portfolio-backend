import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { ISkillReadRepository } from '../../../domain/repositories/skill/ISkillReadRepository'
import { Skill } from '../../../domain/entities/Skill'
import type { SkillCategory } from '../../../domain/entities/Skill'

type PrismaSkill = Prisma.SkillGetPayload<Record<string, never>>

// =============================================================================
// PrismaSkillRepository
// Read-only — skills managed via admin dashboard or seed script.
// findPublished filtered by isPublic — only visible skills returned.
// category ordered alphabetically — groups frontend/backend/devops cleanly.
// =============================================================================
@Injectable()
export class PrismaSkillRepository implements ISkillReadRepository {
    constructor(private readonly prisma: PrismaService) {}

    private static toDomain(raw: PrismaSkill): Skill {
        return new Skill(
            raw.id,
            raw.name,
            raw.imageUrl,
            raw.category as SkillCategory,
            raw.isPublic,
            raw.userId,
            raw.createdAt,
            raw.updatedAt,
        )
    }

    // O(n) — filtered by isPublic index, ordered by category index
    async findPublished(): Promise<Skill[]> {
        const rows = await this.prisma.client.skill.findMany({
            where:   { isPublic: true },
            orderBy: { category: 'asc' },
        })
        return rows.map(PrismaSkillRepository.toDomain)
    }

    async findAll(): Promise<Skill[]> {
        const rows = await this.prisma.client.skill.findMany({
            orderBy: { category: 'asc' },
        })
        return rows.map(PrismaSkillRepository.toDomain)
    }
}