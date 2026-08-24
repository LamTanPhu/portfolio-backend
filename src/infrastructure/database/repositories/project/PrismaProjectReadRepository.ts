/**
 * @fileoverview PrismaProjectReadRepository
 * Read-only repository for Project aggregate.
 *
 * List queries return ProjectSummaryDTO — description is NOT selected from DB
 * (bandwidth saving; description can be large). Single-item queries return the
 * full ProjectDTO with description populated.
 */

import { Injectable } from '@nestjs/common'
import type { IProjectReadRepository } from '../../../../domain/repositories/project/IProjectReadRepository'
import { Project } from '../../../../domain/entities/Project'
import { PrismaService } from '../../prisma/prisma.service'
import { ProjectMapper } from '../../mappers/ProjectMapper'
import { ProjectSummaryDTO } from '../../../../application/dtos/ProjectDTO'

// Shared select for list queries — description intentionally excluded
const LIST_SELECT = {
    id: true,
    name: true,
    slug: true,
    techStack: true,
    repoUrl: true,
    liveUrl: true,
    thumbnailUrl: true,
    isPublished: true,
    isOpenSource: true,
    createdAt: true,
    updatedAt: true,
} as const

@Injectable()
export class PrismaProjectReadRepository implements IProjectReadRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findPublished(): Promise<ProjectSummaryDTO[]> {
        const rows = await this.prisma.client.project.findMany({
            where: { isPublished: true },
            select: LIST_SELECT,
            orderBy: { createdAt: 'desc' },
        })

        return rows.map((row) => PrismaProjectReadRepository.toSummary(row))
    }

    async findAll(): Promise<ProjectSummaryDTO[]> {
        const rows = await this.prisma.client.project.findMany({
            select: LIST_SELECT,
            orderBy: { createdAt: 'desc' },
        })

        return rows.map((row) => PrismaProjectReadRepository.toSummary(row))
    }

    async findById(id: number): Promise<Project | null> {
        const row = await this.prisma.client.project.findUnique({ where: { id } })
        return row ? ProjectMapper.toDomain(row) : null
    }

    async findBySlug(slug: string): Promise<Project | null> {
        const row = await this.prisma.client.project.findUnique({ where: { slug } })
        return row ? ProjectMapper.toDomain(row) : null
    }

    // ─── Private Mappers ─────────────────────────────────────────────────────

    private static toSummary(row: {
        id: number
        name: string
        slug: string
        techStack: unknown
        repoUrl: string | null
        liveUrl: string | null
        thumbnailUrl: string | null
        isPublished: boolean
        isOpenSource: boolean
        createdAt: Date
        updatedAt: Date
    }): ProjectSummaryDTO {
        return {
            id: row.id,
            name: row.name,
            slug: row.slug,
            techStack: row.techStack as string[],
            repoUrl: row.repoUrl,
            liveUrl: row.liveUrl,
            thumbnailUrl: row.thumbnailUrl,
            isPublished: row.isPublished,
            isOpenSource: row.isOpenSource,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        }
    }
}
