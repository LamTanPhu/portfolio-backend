import { Injectable } from '@nestjs/common'
import { ContactMe } from '../../../domain/entities/ContactMe'
import type { IContactWriteRepository } from '../../../domain/repositories/contact/IContactWriteRepository'
import { PrismaService } from '../prisma/prisma.service'

// =============================================================================
// PrismaContactRepository
// Write-only — contact messages are never read back through the domain.
// Admin reads contacts directly via Prisma Studio or future admin endpoint.
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
                // createdAt set by database default — never trust client timestamps
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