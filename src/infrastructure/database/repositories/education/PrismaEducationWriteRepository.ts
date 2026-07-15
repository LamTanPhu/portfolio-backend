/**
 * @fileoverview PrismaEducationWriteRepository
 * Write-only repository for Education records.
 */

import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Education as PrismaEducationRow } from '@prisma/client'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import { Education } from '../../../../domain/entities/Education'
import type {
    CreateEducationInput,
    IEducationWriteRepository,
    UpdateEducationInput,
} from '../../../../domain/repositories/education/IEducationWriteRepository'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class PrismaEducationWriteRepository implements IEducationWriteRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateEducationInput): Promise<Education> {
        const row = await this.prisma.client.education.create({ data })
        return this.toDomain(row)
    }

    async update(id: number, data: UpdateEducationInput): Promise<Education> {
        try {
            const row = await this.prisma.client.education.update({
                where: { id },
                data,
            })
            return this.toDomain(row)
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundError(`Education not found: ${id}`)
            }
            throw error
        }
    }

    async delete(id: number): Promise<void> {
        try {
            await this.prisma.client.education.delete({ where: { id } })
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundError(`Education not found: ${id}`)
            }
            throw error
        }
    }

    private toDomain(raw: PrismaEducationRow): Education {
        return new Education(
            raw.id,
            raw.degreeName,
            raw.instituteName,
            raw.instituteUrl,
            raw.startedAt,
            raw.endedAt,
            raw.isCompleted,
            raw.userId,
            raw.createdAt,
            raw.updatedAt,
        )
    }
}