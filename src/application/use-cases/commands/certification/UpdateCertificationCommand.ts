/**
 * @fileoverview UpdateCertificationCommand
 *
 * Updates a certification and invalidates relevant caches.
 * If the certification is published, the public list cache is cleared.
 */

import { Inject, Injectable } from '@nestjs/common'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'
import type {
    ICertificationWriteRepository,
    UpdateCertificationInput,
} from '../../../../domain/repositories/certification/ICertificationWriteRepository'
import type { CertificationDTO } from '../../../dtos/certification/CertificationDTO'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'

interface UpdateInput extends UpdateCertificationInput {
    id: number
}

@Injectable()
export class UpdateCertificationCommand {
    constructor(
        @Inject('ICertificationWriteRepository')
        private readonly repo: ICertificationWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(input: UpdateInput): Promise<CertificationDTO> {
        const { id, ...data } = input

        const updated = await this.repo.update(id, data)

        // Always invalidate public list
        await this.cacheService.invalidatePublicCertifications()

        return {
            id: updated.id,
            name: updated.name,
            url: updated.url,
            startDate: updated.startDate.toISOString(),
            endDate: updated.endDate?.toISOString() ?? null,
        }
    }
}
