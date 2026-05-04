import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service'
import { ContactMessageDTO } from '../../../dtos/ContactMessageDTO'

// =============================================================================
// GetContactMessagesQuery
// Returns all contact form submissions — admin only.
// Ordered by most recent first — newest messages shown first in dashboard.
// Queries Prisma directly — no domain entity needed for read-only admin view.
// =============================================================================
@Injectable()
export class GetContactMessagesQuery {
    constructor(private readonly prisma: PrismaService) {}

    async execute(): Promise<ContactMessageDTO[]> {
        const rows = await this.prisma.client.contactMe.findMany({
        orderBy: { createdAt: 'desc' },
        })
        return rows.map((r) => ({
        id:          r.id,
        name:        r.name,
        email:       r.email,
        message:     r.message,
        ipAddress:   r.ipAddress,
        browserInfo: r.browserInfo,
        createdAt:   r.createdAt.toISOString(),
        }))
    }
}