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
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import type { ContactMessageDTO } from '../../../dtos/contact/ContactMessageDTO'
import { CACHE_QUERY_SERVICE, CACHE_INVALIDATION_SERVICE } from '../../../../infrastructure/cache/cache.module'

/** Stable cache key — invalidated by DeleteContactMessageCommand on every delete */
export const CONTACT_LIST_CACHE_KEY = 'contact:list:admin'

@Injectable()
export class GetContactMessagesQuery {
    constructor(
        @Inject('IContactReadRepository')
        private readonly repo: IContactReadRepository,

        @Inject(CACHE_QUERY_SERVICE)
        private readonly cacheQuery: ICacheQueryService,
    ) {}

    async execute(): Promise<ContactMessageDTO[]> {
        return this.cacheQuery.getOrSetWithProfile(
            CONTACT_LIST_CACHE_KEY,
            'SHORT',                    // 1 min fresh, 5 min stale
            async () => {
                const messages = await this.repo.findAll()
                return messages.map((m) => ({
                    id:          m.id,
                    name:        m.name,
                    email:       m.email,
                    message:     m.message,
                    ipAddress:   m.ipAddress,
                    browserInfo: m.browserInfo,
                    createdAt:   m.createdAt.toISOString(),
                }))
            },
        )
    }
}