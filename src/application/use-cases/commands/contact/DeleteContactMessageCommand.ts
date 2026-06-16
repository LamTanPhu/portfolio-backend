/**
 * @fileoverview DeleteContactMessageCommand
 *
 * Admin-only command to delete a contact message (spam removal).
 *
 * Fixes applied from audit:
 * 1. Was injecting PrismaService directly into the application layer — now
 *    correctly depends on IContactWriteRepository (Dependency Inversion).
 * 2. Cache invalidation was commented out — now activated.
 *    GetContactMessagesQuery caches contact:list:admin with SHORT profile
 *    (1 min fresh, 5 min stale). Without invalidation, admins see stale
 *    data for up to 6 minutes after a delete — that's a real UI bug.
 */

import { Injectable, Inject } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { IContactWriteRepository } from '../../../../domain/repositories/contact/IContactWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import { CACHE_INVALIDATION_SERVICE } from '../../../../infrastructure/cache/cache.module'

@Injectable()
export class DeleteContactMessageCommand {
    constructor(
        @Inject('IContactWriteRepository')
        private readonly repo: IContactWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(id: number): Promise<void> {
        const deleted = await this.repo.delete(id)

        if (!deleted) {
            throw new NotFoundError(`Contact message not found: ${id}`)
        }

        // Invalidate the admin contact list cache — ensures the admin dashboard
        // reflects the deletion immediately instead of serving stale data.
        await this.cacheService.invalidateContactList()
    }
}