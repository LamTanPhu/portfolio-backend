/**
 * @fileoverview GetContactMessagesQuery
 *
 * Admin-only query returning all contact form submissions.
 * Uses SHORT cache profile — 1 min fresh, 5 min stale.
 *
 * Previously violated Clean Architecture by injecting PrismaService directly
 * into the application layer. Now correctly depends only on the
 * IContactReadRepository port (Dependency Inversion Principle).
 */

import { Inject, Injectable } from '@nestjs/common'
import type { IContactReadRepository } from '../../../../domain/repositories/contact/IContactReadRepository'
import type { ICacheQueryService } from '../../../ports/ICacheQueryService'
import type { ContactMessageDTO } from '../../../dtos/contact/ContactMessageDTO'
import { CACHE_QUERY_SERVICE } from '../../../../application/ports/cache.tokens'

export interface ContactPageDTO {
    items:      ContactMessageDTO[]
    nextCursor: number | null
    total:      number
}

// Cache key includes cursor+limit so different pages are cached independently.
// Invalidated by DeleteContactMessageCommand on every delete.
export const contactListCacheKey = (cursor?: number, limit?: number) =>
    `contact:list:admin:cursor=${cursor ?? 'start'}:limit=${limit ?? 20}`

@Injectable()
export class GetContactMessagesQuery {
    constructor(
        @Inject('IContactReadRepository')
        private readonly repo: IContactReadRepository,

        @Inject(CACHE_QUERY_SERVICE)
        private readonly cacheQuery: ICacheQueryService,
    ) {}

    async execute(cursor?: number, limit?: number): Promise<ContactPageDTO> {
        return this.cacheQuery.getOrSetWithProfile(
            contactListCacheKey(cursor, limit),
            'SHORT',                    // 1 min fresh, 5 min stale
            async () => {
                const page = await this.repo.findPaginated(cursor, limit)
                return {
                    items: page.items.map((m) => ({
                        id:          m.id,
                        name:        m.name,
                        email:       m.email,
                        message:     m.message,
                        ipAddress:   m.ipAddress,
                        browserInfo: m.browserInfo,
                        createdAt:   m.createdAt.toISOString(),
                    })),
                    nextCursor: page.nextCursor,
                    total:      page.total,
                }
            },
        )
    }
}