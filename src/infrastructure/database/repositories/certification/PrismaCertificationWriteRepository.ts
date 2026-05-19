/**
 * @fileoverview PrismaCertificationWriteRepository
 */

import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import { Certification } from '../../../../domain/entities/Certification'
import type {
    CreateCertificationInput,
    ICertificationWriteRepository,
    UpdateCertificationInput,
} from '../../../../domain/repositories/certification/ICertificationWriteRepository'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class PrismaCertificationWriteRepository implements ICertificationWriteRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateCertificationInput): Promise<Certification> {
        const row = await this.prisma.client.certification.create({ data })
        return this.toDomain(row)
    }

    async update(id: number, data: UpdateCertificationInput): Promise<Certification> {
        try {
            const row = await this.prisma.client.certification.update({
                where: { id },
                data,
            })
            return this.toDomain(row)
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundError(`Certification not found: ${id}`)
            }
            throw error
        }
    }

    async delete(id: number): Promise<void> {
        try {
        await this.prisma.client.certification.delete({ where: { id } })
        } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new NotFoundError(`Certification not found: ${id}`)
        }
        throw error
        }
    }

    private toDomain(raw: any): Certification {
        return new Certification(
            raw.id,
            raw.name,
            raw.url,
            raw.isPublished,
            raw.startDate,
            raw.endDate,
            raw.userId,
            raw.createdAt,
            raw.updatedAt,
        )
    }
}