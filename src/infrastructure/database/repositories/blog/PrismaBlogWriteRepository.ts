import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Blog } from '../../../../domain/entities/Blog'
import { ConflictError } from '../../../../domain/errors/ConflictError'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type {
    CreateBlogInput,
    IBlogWriteRepository,
    UpdateBlogInput,
} from '../../../../domain/repositories/blog/IBlogWriteRepository'
import { PrismaService } from '../../prisma/prisma.service'
import { PrismaBlogMapper } from '../../mappers/PrismaBlogMapper'
import type { TransactionalClient } from '../../../../application/ports/IUnitOfWork'

// =============================================================================
// Prisma Payload Types - Write Operations
// =============================================================================

type BlogWithTags = Prisma.BlogGetPayload<{
    include: { tags: true }
}>

// =============================================================================
// PrismaBlogWriteRepository
// Write-only repository for Blog aggregate.
//
// Every method accepts an optional `tx` (transactional client) parameter.
// When provided, the operation runs inside the caller's transaction and is
// rolled back atomically with any other `tx`-aware operations if an error
// is thrown. When omitted, the global PrismaService client is used as normal.
//
// Example — atomic blog create + page view increment:
//   await uow.transaction(async (tx) => {
//     await blogWriteRepo.create(data, tx)
//     await pageViewRepo.increment('/blog/' + data.slug, tx)
//   })
// =============================================================================
@Injectable()
export class PrismaBlogWriteRepository implements IBlogWriteRepository {
    constructor(private readonly prisma: PrismaService) {}

    // Returns the transactional client if provided, otherwise the global one.
    private db(tx?: TransactionalClient) {
        return tx ?? this.prisma.client
    }

    // ===========================================================================
    // Write Operations
    // ===========================================================================

    async create(data: CreateBlogInput, tx?: TransactionalClient): Promise<Blog> {
        try {
            const row = await this.db(tx).blog.create({
                data: {
                    title: data.title,
                    slug: data.slug,
                    content: data.content,
                    excerpt: data.excerpt,
                    isPublished: data.isPublished,
                    publishedAt: data.publishedAt,
                    userId: data.userId,
                    tags: {
                        create: data.tags.map((name) => ({ name })),
                    },
                },
                include: { tags: true },
            })

            return PrismaBlogMapper.toDomain(row)
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictError(`A blog with slug "${data.slug}" already exists`)
            }
            throw error
        }
    }

    async update(id: number, data: UpdateBlogInput, tx?: TransactionalClient): Promise<Blog> {
        const { tags, ...scalarFields } = data

        try {
            const row = await this.db(tx).blog.update({
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
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundError(`Blog not found: ${id}`)
            }
            throw error
        }
    }

    async delete(id: number, tx?: TransactionalClient): Promise<void> {
        try {
            await this.db(tx).blog.delete({ where: { id } })
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundError(`Blog not found: ${id}`)
            }
            throw error
        }
    }
}
