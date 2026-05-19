/**
 * @fileoverview GetCertificationsQuery
 * 
 * Public query returning all published certifications with caching.
 * Uses LONG cache profile for optimal performance + freshness.
 */

import { Inject, Injectable } from '@nestjs/common'
import type { ICertificationReadRepository } from '../../../../../domain/repositories/certification/ICertificationReadRepository'
import { CertificationDTO } from '../../../../dtos/certification/CertificationDTO'
import type { ICacheQueryService } from '../../../../ports/ICacheQueryService'

@Injectable()
export class GetCertificationsQuery {
    constructor(
        @Inject('ICertificationReadRepository')
        private readonly repo: ICertificationReadRepository,

        @Inject('ICacheQueryService')
        private readonly cacheQuery: ICacheQueryService,
    ) {}

    async execute(): Promise<CertificationDTO[]> {
        return this.cacheQuery.getOrSetWithProfile(
        'certification:list:public',
        'LONG',
        async () => {
            const certifications = await this.repo.findPublished()
            return certifications
        },
        )
    }
}