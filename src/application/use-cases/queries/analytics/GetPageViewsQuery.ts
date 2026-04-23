import { Injectable, Inject } from '@nestjs/common'
import type { IPageViewRepository } from '../../../../domain/repositories/analytics/IPageViewRepository'
import type { PageViewDTO } from '../../../dtos/PageViewDTO'

// =============================================================================
// GetPageViewsQuery
// Returns all page view stats ordered by count descending.
// Admin-only — never exposed on public endpoints.
// Dates serialized as ISO 8601 strings — domain Date objects never cross layers.
// =============================================================================
@Injectable()
export class GetPageViewsQuery {
    constructor(
        @Inject('IPageViewRepository')
        private readonly repo: IPageViewRepository,
    ) {}

    async execute(): Promise<PageViewDTO[]> {
        const views = await this.repo.findAll()
        return views.map((v) => ({
            route:        v.route,
            count:        v.count,
            lastViewedAt: v.lastViewedAt.toISOString(),
        }))
    }
}