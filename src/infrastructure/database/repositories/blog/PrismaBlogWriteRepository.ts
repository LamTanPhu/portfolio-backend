import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Blog } from '../../../../domain/entities/Blog'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type {
    CreateBlogInput,
    IBlogWriteRepository,
    UpdateBlogInput,
} from '../../../../domain/repositories/blog/IBlogWriteRepository'
import { PrismaService } from '../../prisma/prisma.service'
import { PrismaBlogMapper } from '../../mappers/PrismaBlogMapper'

// =============================================================================
// Prisma Payload Types - Write Operations
// =============================================================================

type BlogWithTags = Prisma.BlogGetPayload<{
    include: { tags: true }
}>

// =============================================================================
// PrismaBlogWriteRepository
// Write-only implementation for Blog aggregate.
// =============================================================================
@Injectable()
export class PrismaBlogWriteRepository implements IBlogWriteRepository {
    constructor(private readonly prisma: PrismaService) {}

    // ===========================================================================
    // Write Operations
    // ===========================================================================

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
                tags: {
                    create: data.tags.map((name) => ({ name })),
                },
            },
            include: { tags: true },
        })

        return PrismaBlogMapper.toDomain(row)
    }

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

            return PrismaBlogMapper.toDomain(row)
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