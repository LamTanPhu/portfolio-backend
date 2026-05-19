/**
 * @fileoverview GetContactMessagesQuery
 * 
 * Admin-only query that returns all contact form submissions.
 * Uses SHORT cache profile because admin dashboard needs reasonable freshness.
 */

import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service'

import { ContactMessageDTO } from '../../../dtos/contact/ContactMessageDTO'
import type { ICacheQueryService } from '../../../ports/ICacheQueryService'

@Injectable()
export class GetContactMessagesQuery {
    constructor(
        private readonly prisma: PrismaService,

        @Inject('ICacheQueryService')
        private readonly cacheQuery: ICacheQueryService,
    ) {}

    async execute(): Promise<ContactMessageDTO[]> {
        return this.cacheQuery.getOrSetWithProfile(
        'contact:list:admin',
        'SHORT',                    // 1 min fresh, 5 min stale
        async () => {
            const rows = await this.prisma.client.contactMe.findMany({
            orderBy: { createdAt: 'desc' },
            })

            return rows.map((r) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            message: r.message,
            ipAddress: r.ipAddress,
            browserInfo: r.browserInfo,
            createdAt: r.createdAt.toISOString(),
            }))
        },
        )
    }
}