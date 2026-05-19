/**
 * @fileoverview UpdateCertificationCommand
 * 
 * Updates a certification and invalidates relevant caches.
 * If the certification is published, the public list cache is cleared.
 */

import { Injectable, Inject } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type {
  ICertificationWriteRepository,
  UpdateCertificationInput,
} from '../../../../domain/repositories/certification/ICertificationWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import type { CertificationDTO } from '../../../dtos/certification/CertificationDTO'

interface UpdateInput extends UpdateCertificationInput {
    id: number
}

@Injectable()
export class UpdateCertificationCommand {
    constructor(
        @Inject('ICertificationWriteRepository')
        private readonly repo: ICertificationWriteRepository,

        @Inject('ICacheInvalidationService')
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