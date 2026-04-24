import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { ISkillReadRepository } from '../../../domain/repositories/skill/ISkillReadRepository'
import type {
    ISkillWriteRepository,
    CreateSkillInput,
    UpdateSkillInput,
} from '../../../domain/repositories/skill/ISkillWriteRepository'
import { Skill } from '../../../domain/entities/Skill'
import type { SkillCategory } from '../../../domain/entities/Skill'

type PrismaSkill = Prisma.SkillGetPayload<Record<string, never>>

// =============================================================================
// PrismaSkillRepository
// Implements both read and write interfaces for Skill aggregate.
// findPublished filtered by isPublic — only visible skills returned publicly.
// category ordered alphabetically — groups frontend/backend/devops cleanly.
// =============================================================================
@Injectable()
    export class PrismaSkillRepository
        implements ISkillReadRepository, ISkillWriteRepository
    {
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

    // ===========================================================================
    // Read Operations
    // ===========================================================================

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

    async findById(id: number): Promise<Skill | null> {
        const row = await this.prisma.client.skill.findUnique({ where: { id } })
        return row ? PrismaSkillRepository.toDomain(row) : null
    }

    // ===========================================================================
    // Write Operations
    // ===========================================================================

    async create(data: CreateSkillInput): Promise<Skill> {
        const row = await this.prisma.client.skill.create({ data })
        return PrismaSkillRepository.toDomain(row)
    }

    async update(id: number, data: UpdateSkillInput): Promise<Skill> {
        const row = await this.prisma.client.skill.update({
            where: { id },
            data,
        })
        return PrismaSkillRepository.toDomain(row)
    }

    async delete(id: number): Promise<void> {
        await this.prisma.client.skill.delete({ where: { id } })
    }
}