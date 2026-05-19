/**
 * @fileoverview DeleteCertificationCommand
 * 
 * Deletes a certification and invalidates the public cache.
 */

import { Injectable, Inject } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { ICertificationWriteRepository } from '../../../../domain/repositories/certification/ICertificationWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'

@Injectable()
export class DeleteCertificationCommand {
    constructor(
        @Inject('ICertificationWriteRepository')
        private readonly repo: ICertificationWriteRepository,

        @Inject('ICacheInvalidationService')
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(id: number): Promise<void> {
        await this.repo.delete(id)
        // Invalidate public cache so deleted item disappears from frontend
        await this.cacheService.invalidatePublicCertifications()
    }
}