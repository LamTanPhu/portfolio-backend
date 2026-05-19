/**
 * @fileoverview PrismaSocialAccountWriteRepository
 * Write-only repository for SocialAccount aggregate.
 */

import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { SocialAccount } from '../../../../domain/entities/SocialAccount'
import type {
    CreateSocialAccountInput,
    ISocialAccountWriteRepository,
    UpdateSocialAccountInput,
} from '../../../../domain/repositories/social/ISocialAccountWriteRepository'
import { PrismaService } from '../../prisma/prisma.service'
import { PrismaSocialAccountMapper } from '../../mappers/PrismaSocialAccountMapper'

@Injectable()
export class PrismaSocialAccountWriteRepository implements ISocialAccountWriteRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateSocialAccountInput): Promise<SocialAccount> {
        const row = await this.prisma.client.socialAccount.create({ data })
        return PrismaSocialAccountMapper.toDomain(row)
    }

    async update(id: number, data: UpdateSocialAccountInput): Promise<SocialAccount> {
        try {
        const row = await this.prisma.client.socialAccount.update({
            where: { id },
            data,
        })
        return PrismaSocialAccountMapper.toDomain(row)
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