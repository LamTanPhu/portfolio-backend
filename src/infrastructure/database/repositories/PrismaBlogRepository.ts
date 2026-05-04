import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { IBlogReadRepository } from '../../../domain/repositories/blog/IBlogReadRepository'
import type {
    IBlogWriteRepository,
    CreateBlogInput,
    UpdateBlogInput,
} from '../../../domain/repositories/blog/IBlogWriteRepository'
import { Blog } from '../../../domain/entities/Blog'
import { BlogTag } from '../../../domain/entities/BlogTag'
import { NotFoundError } from '../../../domain/errors/NotFoundError'

// =============================================================================
// Prisma Payload Types
// Fully derived from Prisma's type system — zero casting, zero any.
// Two shapes: full (single-item) and summary (list views).
// =============================================================================

// Full payload — used for findById, findBySlug, create, update
// Includes content and all fields
type BlogWithTags = Prisma.BlogGetPayload<{
    include: { tags: true }
}>

// Summary payload — used for findAll, findPublished
// content excluded — blog post text can be thousands of words
// O(n × content_size) → O(n × summary_size) on list queries
const LIST_SELECT = {
    id:          true,
    title:       true,
    slug:        true,
    excerpt:     true,
    isPublished: true,
    publishedAt: true,
    createdAt:   true,
    updatedAt:   true,
    userId:      true,
    // content intentionally absent — list views never render full post body
    tags:        true,
} as const

type BlogSummaryWithTags = Prisma.BlogGetPayload<{
    select: typeof LIST_SELECT
}>

// =============================================================================
// PrismaBlogRepository
// Implements both read and write interfaces for the Blog aggregate.
// BlogTag is owned by Blog — always fetched via nested include/select.
// Two mappers enforce correct data shape per query type at compile time.
// =============================================================================
@Injectable()
export class PrismaBlogRepository
    implements IBlogReadRepository, IBlogWriteRepository
{
    constructor(private readonly prisma: PrismaService) {}

    // ===========================================================================
    // Mappers — Prisma model → Domain entity
    // Static methods — no instance state needed, explicit and testable.
    // ===========================================================================

    // Full mapper — used when content is required (single post view)
    private static toDomain(raw: BlogWithTags): Blog {
        const tags = raw.tags.map((t) => new BlogTag(t.id, t.name, t.blogId))
        return new Blog(
            raw.id,
            raw.title,
            raw.slug,
            raw.content,
            raw.excerpt,
            tags,
            raw.isPublished,
            raw.publishedAt,
            raw.userId,
            raw.createdAt,
            raw.updatedAt,
        )
    }

  // Summary mapper — used for list views, content substituted with empty string
  // Type system enforces this mapper is only called with LIST_SELECT results
    private static toDomainSummary(raw: BlogSummaryWithTags): Blog {
        const tags = raw.tags.map((t) => new BlogTag(t.id, t.name, t.blogId))
        return new Blog(
            raw.id,
            raw.title,
            raw.slug,
            '',           // content not fetched — list views never render post body
            raw.excerpt,
            tags,
            raw.isPublished,
            raw.publishedAt,
            raw.userId,
            raw.createdAt,
            raw.updatedAt,
        )
    }

  // ===========================================================================
  // Read Operations
  // ===========================================================================

    // Returns summaries — content column never fetched, tags always included
    async findAll(): Promise<Blog[]> {
        const rows = await this.prisma.client.blog.findMany({
            select:  LIST_SELECT,
            orderBy: { createdAt: 'desc' },
        })
        return rows.map(PrismaBlogRepository.toDomainSummary)
    }

    // Returns published summaries only — ordered by publish date descending
    async findPublished(): Promise<Blog[]> {
        const rows = await this.prisma.client.blog.findMany({
            where:   { isPublished: true },
            select:  LIST_SELECT,
            orderBy: { publishedAt: 'desc' },
        })
        return rows.map(PrismaBlogRepository.toDomainSummary)
    }

    // Returns full blog — content required for single post rendering
    async findById(id: number): Promise<Blog | null> {
        const row = await this.prisma.client.blog.findUnique({
            where:   { id },
            include: { tags: true },
        })
        return row ? PrismaBlogRepository.toDomain(row) : null
    }

    // Returns full blog — slug is unique indexed, O(1) lookup
    async findBySlug(slug: string): Promise<Blog | null> {
        const row = await this.prisma.client.blog.findUnique({
            where:   { slug },
            include: { tags: true },
        })
        return row ? PrismaBlogRepository.toDomain(row) : null
    }

    // ===========================================================================
    // Write Operations
    // ===========================================================================

    // Atomic create — tags nested inside single transaction
    async create(data: CreateBlogInput): Promise<Blog> {
        const row = await this.prisma.client.blog.create({
        data: {
            title:       data.title,
            slug:        data.slug,
            content:     data.content,
            excerpt:     data.excerpt,
            isPublished: data.isPublished,
            publishedAt: data.publishedAt,
            userId:      data.userId,
            // Nested write — blog + tags created atomically
            tags: {
            create: data.tags.map((name) => ({ name })),
            },
        },
        include: { tags: true },
        })
        return PrismaBlogRepository.toDomain(row)
    }

    // Atomic update — tags replaced in full via deleteMany + create
    // Avoids partial state if update fails midway
    async update(id: number, data: UpdateBlogInput): Promise<Blog> {
        const { tags, ...scalarFields } = data
        try {
            const row = await this.prisma.client.blog.update({
            where: { id },
            data: {
                    ...scalarFields,
                    ...(tags !== undefined && {
                    tags: {
                        deleteMany: {},
                        create: tags.map((name) => ({ name })),
                    },
                }),
            },
                include: { tags: true },
            })
            return PrismaBlogRepository.toDomain(row)
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                throw new NotFoundError(`Blog not found: ${id}`)
            }
            throw error
        }
    }

    // Tags cascade deleted automatically via onDelete: Cascade in schema
    async delete(id: number): Promise<void> {
        try {
            await this.prisma.client.blog.delete({ where: { id } })
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                throw new NotFoundError(`Blog not found: ${id}`)
            }
            throw error
        }
    }
}