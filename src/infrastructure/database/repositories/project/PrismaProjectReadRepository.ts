/**
 * @fileoverview PrismaProjectReadRepository
 * Read-only repository for Project aggregate.
 */

import { Injectable } from '@nestjs/common'
import type { IProjectReadRepository } from '../../../../domain/repositories/project/IProjectReadRepository'
import { Project } from '../../../../domain/entities/Project'
import { PrismaService } from '../../prisma/prisma.service'
import { ProjectMapper } from '../../mappers/ProjectMapper'
import { ProjectDTO } from '../../../../application/dtos/ProjectDTO'

@Injectable()
export class PrismaProjectReadRepository implements IProjectReadRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findPublished(): Promise<ProjectDTO[]> {
        const rows = await this.prisma.client.project.findMany({
        where: { isPublished: true },
        select: {
            id:           true,
            name:         true,
            description:  true,
            slug:         true,
            techStack:    true,
            repoUrl:      true,
            liveUrl:      true,
            thumbnailUrl: true,
            isPublished:  true,
            isOpenSource: true,
            createdAt:    true,
            updatedAt:    true,
        },
        orderBy: { createdAt: 'desc' },
        })

        return rows.map(row => ({
        id:           row.id,
        name:         row.name,
        description:  row.description || '',
        slug:         row.slug,
        techStack:    row.techStack as string[],
        repoUrl:      row.repoUrl,
        liveUrl:      row.liveUrl,
        thumbnailUrl: row.thumbnailUrl,
        isPublished:  row.isPublished,
        isOpenSource: row.isOpenSource,
        createdAt:    row.createdAt.toISOString(),
        updatedAt:    row.updatedAt.toISOString(),
        }))
    }

    async findAll(): Promise<ProjectDTO[]> {
        const rows = await this.prisma.client.project.findMany({
        select: {
            id:           true,
            name:         true,
            description:  true,
            slug:         true,
            techStack:    true,
            repoUrl:      true,
            liveUrl:      true,
            thumbnailUrl: true,
            isPublished:  true,
            isOpenSource: true,
            createdAt:    true,
            updatedAt:    true,
        },
        orderBy: { createdAt: 'desc' },
        })

        return rows.map(row => ({
        id:           row.id,
        name:         row.name,
        description:  row.description || '',
        slug:         row.slug,
        techStack:    row.techStack as string[],
        repoUrl:      row.repoUrl,
        liveUrl:      row.liveUrl,
        thumbnailUrl: row.thumbnailUrl,
        isPublished:  row.isPublished,
        isOpenSource: row.isOpenSource,
        createdAt:    row.createdAt.toISOString(),
        updatedAt:    row.updatedAt.toISOString(),
        }))
    }

    async findById(id: number): Promise<Project | null> {
        const row = await this.prisma.client.project.findUnique({ where: { id } })
        return row ? ProjectMapper.toDomain(row) : null
    }

    async findBySlug(slug: string): Promise<Project | null> {
        const row = await this.prisma.client.project.findUnique({ where: { slug } })
        return row ? ProjectMapper.toDomain(row) : null
    }
}