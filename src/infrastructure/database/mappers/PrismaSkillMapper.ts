/**
 * @fileoverview PrismaSkillMapper
 * 
 * Centralized mapper for Skill aggregate to avoid duplication.
 */

import { Prisma } from '@prisma/client'
import type { SkillCategory } from '../../../domain/entities/Skill'
import { Skill } from '../../../domain/entities/Skill'

type PrismaSkill = Prisma.SkillGetPayload<Record<string, never>>

export class PrismaSkillMapper {
    static toDomain(raw: PrismaSkill): Skill {
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
}