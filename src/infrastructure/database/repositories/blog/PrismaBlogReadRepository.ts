import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Blog } from '../../../../domain/entities/Blog'
import { BlogSummary } from '../../../../domain/projections/BlogSummary'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'
import { PrismaService } from '../../prisma/prisma.service'
import { PrismaBlogMapper } from '../../mappers/PrismaBlogMapper'

// =============================================================================
// Prisma Payload Types - Read Operations
// =============================================================================

const LIST_SELECT = {
    id: true,
    title: true,
    slug: true,
    excerpt: true,
    isPublished: true,
    publishedAt: true,
    createdAt: true,
    updatedAt: true,
    userId: true,
    tags: { select: { name: true } },
} as const

type BlogSummaryWithTags = Prisma.BlogGetPayload<{
    select: typeof LIST_SELECT
}>

// =============================================================================
// PrismaBlogReadRepository
// Read-only implementation for Blog aggregate.
// =============================================================================
@Injectable()
export class PrismaBlogReadRepository implements IBlogReadRepository {
    constructor(private readonly prisma: PrismaService) {}

    // ===========================================================================
    // Internal Summary Mapper
    // ===========================================================================
    private static toBlogSummary(raw: BlogSummaryWithTags): BlogSummary {
        return {
            id: raw.id,
            title: raw.title,
            slug: raw.slug,
            excerpt: raw.excerpt,
            tags: raw.tags.map((t) => t.name),
            isPublished: raw.isPublished,
            publishedAt: raw.publishedAt,
            createdAt: raw.createdAt,
        }
    }

    // ===========================================================================
    // Read Operations
    // ===========================================================================

    async findPublished(): Promise<BlogSummary[]> {
        const rows = await this.prisma.client.blog.findMany({
            where: { isPublished: true },
            select: LIST_SELECT,
            orderBy: { publishedAt: 'desc' },
        })

        return rows.map((row) => PrismaBlogReadRepository.toBlogSummary(row))
    }

    async findAll(): Promise<BlogSummary[]> {
        const rows = await this.prisma.client.blog.findMany({
            select: LIST_SELECT,
            orderBy: { createdAt: 'desc' },
        })

        return rows.map((row) => PrismaBlogReadRepository.toBlogSummary(row))
    }

    async findById(id: number): Promise<Blog | null> {
        const row = await this.prisma.client.blog.findUnique({
            where: { id },
            include: { tags: true },
        })
        return row ? PrismaBlogMapper.toDomain(row) : null
    }

    async findBySlug(slug: string): Promise<Blog | null> {
        const row = await this.prisma.client.blog.findUnique({
            where: { slug },
            include: { tags: true },
        })
        return row ? PrismaBlogMapper.toDomain(row) : null
    }
}
