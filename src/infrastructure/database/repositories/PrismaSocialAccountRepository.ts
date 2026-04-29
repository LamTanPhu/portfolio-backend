import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { SocialAccount } from '../../../domain/entities/SocialAccount'
import { NotFoundError } from '../../../domain/errors/NotFoundError'
import type { ISocialAccountReadRepository } from '../../../domain/repositories/social/ISocialAccountReadRepository'
import type {
    CreateSocialAccountInput,
    ISocialAccountWriteRepository,
    UpdateSocialAccountInput,
} from '../../../domain/repositories/social/ISocialAccountWriteRepository'
import { PrismaService } from '../prisma/prisma.service'

type PrismaSocialAccount = Prisma.SocialAccountGetPayload<Record<string, never>>

// =============================================================================
// PrismaSocialAccountRepository
// Implements both read and write interfaces for SocialAccount aggregate.
// Write operations catch P2025 — eliminates read-before-write round trip.
// O(1) update/delete — single query instead of findById + mutate.
// =============================================================================
@Injectable()
export class PrismaSocialAccountRepository
    implements ISocialAccountReadRepository, ISocialAccountWriteRepository
    {
    constructor(private readonly prisma: PrismaService) {}

    private static toDomain(raw: PrismaSocialAccount): SocialAccount {
        return new SocialAccount(
        raw.id,
        raw.name,
        raw.url,
        raw.imageUrl,
        raw.isPublic,
        raw.userId,
        raw.createdAt,
        raw.updatedAt,
        )
    }

    // ===========================================================================
    // Read Operations
    // ===========================================================================

    async findPublic(): Promise<SocialAccount[]> {
        const rows = await this.prisma.client.socialAccount.findMany({
        where:   { isPublic: true },
        orderBy: { name: 'asc' },
        })
        return rows.map(PrismaSocialAccountRepository.toDomain)
    }

    async findAll(): Promise<SocialAccount[]> {
        const rows = await this.prisma.client.socialAccount.findMany({
        orderBy: { name: 'asc' },
        })
        return rows.map(PrismaSocialAccountRepository.toDomain)
    }

    async findById(id: number): Promise<SocialAccount | null> {
        const row = await this.prisma.client.socialAccount.findUnique({
        where: { id },
        })
        return row ? PrismaSocialAccountRepository.toDomain(row) : null
    }

    // ===========================================================================
    // Write Operations
    // P2025 caught at repository level — use cases stay clean of Prisma knowledge
    // ===========================================================================

    async create(data: CreateSocialAccountInput): Promise<SocialAccount> {
        const row = await this.prisma.client.socialAccount.create({ data })
        return PrismaSocialAccountRepository.toDomain(row)
    }

    async update(id: number, data: UpdateSocialAccountInput): Promise<SocialAccount> {
        try {
        const row = await this.prisma.client.socialAccount.update({
            where: { id },
            data,
        })
        return PrismaSocialAccountRepository.toDomain(row)
        } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new NotFoundError(`Social account not found: ${id}`)
        }
        throw error
        }
    }

    async delete(id: number): Promise<void> {
        try {
        await this.prisma.client.socialAccount.delete({ where: { id } })
        } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new NotFoundError(`Social account not found: ${id}`)
        }
        throw error
        }
    }
}