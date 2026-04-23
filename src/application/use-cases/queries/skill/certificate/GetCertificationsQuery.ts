import { Injectable, Inject } from '@nestjs/common'
import type { ICertificationReadRepository } from '../../../../../domain/repositories/certification/ICertificationReadRepository'
import type { CertificationDTO } from '../../../../dtos/CertificationDTO'

// =============================================================================
// GetCertificationsQuery
// Returns only published certifications ordered by most recent first.
// isPublished filter applied at repository level — drafts never exposed.
// Dates serialized as ISO 8601 strings — domain Date objects never cross layers.
// =============================================================================
@Injectable()
export class GetCertificationsQuery {
    constructor(
        @Inject('ICertificationReadRepository')
        private readonly repo: ICertificationReadRepository,
    ) {}

    async execute(): Promise<CertificationDTO[]> {
        const certs = await this.repo.findPublished()
        return certs.map((c) => ({
            id:        c.id,
            name:      c.name,
            url:       c.url,
            startDate: c.startDate.toISOString(),
            endDate:   c.endDate?.toISOString() ?? null,
        }))
    }
}