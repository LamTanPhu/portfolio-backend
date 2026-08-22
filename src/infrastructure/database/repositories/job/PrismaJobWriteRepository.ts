/**
 * @fileoverview PrismaJobWriteRepository
 * Write-only repository for Job aggregate.
 */

import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { Job } from '../../../../domain/entities/Job'
import type {
    CreateJobInput,
    IJobWriteRepository,
    UpdateJobInput,
} from '../../../../domain/repositories/job/IJobWriteRepository'
import { PrismaService } from '../../prisma/prisma.service'
import { PrismaJobMapper } from '../../mappers/PrismaJobMapper'

@Injectable()
export class PrismaJobWriteRepository implements IJobWriteRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateJobInput): Promise<Job> {
        const row = await this.prisma.client.job.create({ data })
        return PrismaJobMapper.toDomain(row)
    }

    async update(id: number, data: UpdateJobInput): Promise<Job> {
        try {
            const row = await this.prisma.client.job.update({
                where: { id },
                data,
            })
            return PrismaJobMapper.toDomain(row)
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundError(`Job not found: ${id}`)
            }
            throw error
        }
    }

    async delete(id: number): Promise<void> {
        try {
            await this.prisma.client.job.delete({ where: { id } })
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundError(`Job not found: ${id}`)
            }
            throw error
        }
    }
}
