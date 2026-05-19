/**
 * @fileoverview PrismaProjectWriteRepository
 * Write-only repository for Project aggregate.
 */

import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Project } from '../../../../domain/entities/Project'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type {
    CreateProjectInput,
    IProjectWriteRepository,
    UpdateProjectInput,
} from '../../../../domain/repositories/project/IProjectWriteRepository'
import { ProjectMapper } from '../../mappers/ProjectMapper'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class PrismaProjectWriteRepository implements IProjectWriteRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateProjectInput): Promise<Project> {
        const row = await this.prisma.client.project.create({
        data: ProjectMapper.toPrisma(data),
        })
        return ProjectMapper.toDomain(row)
    }

    async update(id: number, data: UpdateProjectInput): Promise<Project> {
        try {
        const row = await this.prisma.client.project.update({
            where: { id },
            data: { ...data, techStack: data.techStack ?? undefined },
        })
        return ProjectMapper.toDomain(row)
        } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new NotFoundError(`Project not found: ${id}`)
        }
        throw error
        }
    }

    async delete(id: number): Promise<void> {
        try {
        await this.prisma.client.project.delete({ where: { id } })
        } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new NotFoundError(`Project not found: ${id}`)
        }
        throw error
        }
    }
}