/**
 * @fileoverview DeleteContactMessageCommand
 * 
 * Admin-only command to delete a contact message (spam removal).
 */

import { Injectable, Inject } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import { Prisma } from '@prisma/client'

@Injectable()
export class DeleteContactMessageCommand {
    constructor(
        private readonly prisma: PrismaService,

        @Inject('ICacheInvalidationService')
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(id: number): Promise<void> {
        try {
        await this.prisma.client.contactMe.delete({ where: { id } })

        // Optional: Invalidate any admin contact list cache if you implement one later
        // await this.cacheService.invalidatePattern('contact:*');
        } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new NotFoundError(`Contact message not found: ${id}`)
        }
        throw error
        }
    }
}