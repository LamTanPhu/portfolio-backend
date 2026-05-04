import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service'

// =============================================================================
// DeleteContactMessageCommand
// Deletes a contact message — admin only, spam removal.
// P2025 caught at command level — ContactMe has no write repository interface.
// Write-once domain — no IContactWriteRepository for delete needed.
// =============================================================================
@Injectable()
export class DeleteContactMessageCommand {
    constructor(private readonly prisma: PrismaService) {}

    async execute(id: number): Promise<void> {
        try {
        await this.prisma.client.contactMe.delete({ where: { id } })
        } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new NotFoundError(`Contact message not found: ${id}`)
        }
        throw error
        }
    }
}