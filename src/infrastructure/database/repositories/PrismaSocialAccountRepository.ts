import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { ISocialAccountReadRepository } from '../../../domain/repositories/social/ISocialAccountReadRepository'
import { SocialAccount } from '../../../domain/entities/SocialAccount'

type PrismaSocialAccount = Prisma.SocialAccountGetPayload<Record<string, never>>

// =============================================================================
// PrismaSocialAccountRepository
// Read-only — social accounts managed via seed or admin.
// findPublic filtered by isPublic — private accounts never exposed.
// Ordered by name — consistent display order in frontend.
// =============================================================================
@Injectable()
export class PrismaSocialAccountRepository implements ISocialAccountReadRepository {
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

    // O(n) — filtered by isPublic index, ordered by name
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
}