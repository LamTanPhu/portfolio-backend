import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { SkillCategory } from '../../../domain/entities/Skill'
import { Skill } from '../../../domain/entities/Skill'
import { NotFoundError } from '../../../domain/errors/NotFoundError'
import type { ISkillReadRepository } from '../../../domain/repositories/skill/ISkillReadRepository'
import type {
    CreateSkillInput,
    ISkillWriteRepository,
    UpdateSkillInput,
} from '../../../domain/repositories/skill/ISkillWriteRepository'
import { PrismaService } from '../prisma/prisma.service'

type PrismaSkill = Prisma.SkillGetPayload<Record<string, never>>

// =============================================================================
// PrismaSkillRepository
// Implements both read and write interfaces for Skill aggregate.
// Write operations catch P2025 — eliminates read-before-write round trip.
// O(1) update/delete — single query instead of findById + mutate.
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
    // P2025 caught at repository level — use cases stay clean of Prisma knowledge
    // ===========================================================================

    async create(data: CreateSkillInput): Promise<Skill> {
        const row = await this.prisma.client.skill.create({ data })
        return PrismaSkillRepository.toDomain(row)
    }

    async update(id: number, data: UpdateSkillInput): Promise<Skill> {
        try {
        const row = await this.prisma.client.skill.update({
            where: { id },
            data,
        })
        return PrismaSkillRepository.toDomain(row)
        } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new NotFoundError(`Skill not found: ${id}`)
        }
        throw error
        }
    }

    async delete(id: number): Promise<void> {
        try {
        await this.prisma.client.skill.delete({ where: { id } })
        } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new NotFoundError(`Skill not found: ${id}`)
        }
        throw error
        }
    }
}