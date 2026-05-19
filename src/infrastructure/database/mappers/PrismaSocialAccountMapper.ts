/**
 * @fileoverview PrismaSocialAccountMapper
 * 
 * Centralized mapper for SocialAccount aggregate to avoid duplication.
 */

import { Prisma } from '@prisma/client'
import { SocialAccount } from '../../../domain/entities/SocialAccount'

type PrismaSocialAccount = Prisma.SocialAccountGetPayload<Record<string, never>>

export class PrismaSocialAccountMapper {
    static toDomain(raw: PrismaSocialAccount): SocialAccount {
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
}