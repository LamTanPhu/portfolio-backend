/**
 * @fileoverview PrismaSocialAccountReadRepository
 * Read-only repository for SocialAccount aggregate.
 */

import { Injectable } from '@nestjs/common'
import type { ISocialAccountReadRepository } from '../../../../domain/repositories/social/ISocialAccountReadRepository'
import type { SocialAccountDTO } from '../../../../application/dtos/SocialAccountDTO'
import { SocialAccount } from '../../../../domain/entities/SocialAccount'
import { PrismaService } from '../../prisma/prisma.service'
import { PrismaSocialAccountMapper } from '../../mappers/PrismaSocialAccountMapper'

@Injectable()
export class PrismaSocialAccountReadRepository implements ISocialAccountReadRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findPublic(): Promise<SocialAccountDTO[]> {
        const rows = await this.prisma.client.socialAccount.findMany({
        where:   { isPublic: true },
        orderBy: { name: 'asc' },
            select: {
                id:       true,
                name:     true,
                url:      true,
                imageUrl: true,
                isPublic: true,
            },
        })

        return rows.map(row => ({
            id:       row.id,
            name:     row.name,
            url:      row.url,
            imageUrl: row.imageUrl,
            isPublic: row.isPublic,
        }))
    }

    async findAll(): Promise<SocialAccount[]> {
        const rows = await this.prisma.client.socialAccount.findMany({
            orderBy: { name: 'asc' },
        })
        return rows.map(PrismaSocialAccountMapper.toDomain)
    }

    async findById(id: number): Promise<SocialAccount | null> {
        const row = await this.prisma.client.socialAccount.findUnique({ where: { id } })
        return row ? PrismaSocialAccountMapper.toDomain(row) : null
    }
}