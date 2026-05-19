/**
 * @fileoverview PrismaSkillWriteRepository
 * Write-only repository for Skill aggregate.
 */

import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Skill } from '../../../../domain/entities/Skill'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type {
    CreateSkillInput,
    ISkillWriteRepository,
    UpdateSkillInput,
} from '../../../../domain/repositories/skill/ISkillWriteRepository'
import { PrismaSkillMapper } from '../../mappers/PrismaSkillMapper'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class PrismaSkillWriteRepository implements ISkillWriteRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateSkillInput): Promise<Skill> {
        const row = await this.prisma.client.skill.create({ data })
        return PrismaSkillMapper.toDomain(row)
    }

    async update(id: number, data: UpdateSkillInput): Promise<Skill> {
        try {
        const row = await this.prisma.client.skill.update({
            where: { id },
            data,
        })
        return PrismaSkillMapper.toDomain(row)
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