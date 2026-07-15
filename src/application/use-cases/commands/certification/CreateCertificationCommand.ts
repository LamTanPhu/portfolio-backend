/**
 * @fileoverview CreateCertificationCommand
 * 
 * Creates a new certification and invalidates the public cache
 * so the new item appears immediately on the frontend.
 */

import { Injectable, Inject } from '@nestjs/common'
import type { ICertificationWriteRepository, CreateCertificationInput } from '../../../../domain/repositories/certification/ICertificationWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import type { CertificationDTO } from '../../../dtos/certification/CertificationDTO'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

@Injectable()
export class CreateCertificationCommand {
    constructor(
        @Inject('ICertificationWriteRepository')
        private readonly repo: ICertificationWriteRepository,

        @Inject(CACHE_INVALIDATION_SERVICE)
        private readonly cacheService: ICacheInvalidationService,
    ) {}

    async execute(input: CreateCertificationInput): Promise<CertificationDTO> {
        const certification = await this.repo.create(input)

        // Invalidate public list cache so new certification shows up immediately
        await this.cacheService.invalidatePublicCertifications()

        return {
        id: certification.id,
        name: certification.name,
        url: certification.url,
        startDate: certification.startDate.toISOString(),
        endDate: certification.endDate?.toISOString() ?? null,
        }
    }
}