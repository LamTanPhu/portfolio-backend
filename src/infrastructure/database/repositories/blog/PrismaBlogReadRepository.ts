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

    // =========================================================================
    // search
    //
    // Only the ranked-ID lookup needs raw SQL — search_vector is Prisma's
    // `Unsupported("tsvector")` type, unreachable through the normal query
    // builder at all. Everything after that (loading the actual row data,
    // its tags, mapping to the summary shape) goes straight back through
    // the same typed path every other read in this file uses.
    //
    // websearch_to_tsquery (not plainto_tsquery) — accepts the kind of
    // input a person actually types into a search box: quoted phrases,
    // "OR", a leading "-" to exclude a term. plainto_tsquery ANDs every
    // word together with no such handling.
    //
    // Tagged-template $queryRaw, never $queryRawUnsafe — Prisma
    // parameterizes `${query}` automatically here, same guarantee as a
    // normal parameterized query. String-concatenating user input into
    // SQL is exactly what $queryRawUnsafe would invite.
    // =========================================================================
    async search(query: string, limit = 20): Promise<BlogSummary[]> {
        const ranked = await this.prisma.client.$queryRaw<{ id: number }[]>`
            SELECT id
            FROM blogs
            WHERE is_published = true
            AND search_vector @@ websearch_to_tsquery('english', ${query})
            ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', ${query})) DESC
            LIMIT ${limit}
        `

        if (ranked.length === 0) return []

        const rows = await this.prisma.client.blog.findMany({
            where: { id: { in: ranked.map((r) => r.id) } },
            select: LIST_SELECT,
        })

        // findMany() with `id: { in: [...] }` does not preserve input
        // order — re-sort by the original rank order from the query above,
        // or results would come back in arbitrary DB order and the
        // ts_rank sort we just paid for would be silently discarded.
        const byId = new Map(rows.map((row) => [row.id, row]))
        return ranked
            .map((r) => byId.get(r.id))
            .filter((row): row is BlogSummaryWithTags => row !== undefined)
            .map((row) => PrismaBlogReadRepository.toBlogSummary(row))
    }
}
