import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { IContactWriteRepository } from '../../../domain/repositories/contact/IContactWriteRepository'
import { ContactMe } from '../../../domain/entities/ContactMe'

// =============================================================================
// PrismaContactRepository
// Write-only — contact messages never read back through the domain layer.
// Admin reads contacts via Prisma Studio or a future admin endpoint.
// createdAt set by database default — never trusted from application layer.
// =============================================================================
@Injectable()
export class PrismaContactRepository implements IContactWriteRepository {
    constructor(private readonly prisma: PrismaService) {}

    async save(data: Omit<ContactMe, 'id'>): Promise<ContactMe> {
        const row = await this.prisma.client.contactMe.create({
        data: {
            name:        data.name,
            email:       data.email,
            message:     data.message,
            ipAddress:   data.ipAddress,
            browserInfo: data.browserInfo,
            // createdAt set by DB default — never trust client-provided timestamps
        },
    })

    return new ContactMe(
        row.id,
        row.name,
        row.email,
        row.message,
        row.ipAddress,
        row.browserInfo,
        row.createdAt,
        )
    }
}