import { Inject, Injectable } from '@nestjs/common'
import type { IPageViewRepository } from '../../../../domain/repositories/analytics/IPageViewRepository'
import type { PageViewDTO } from '../../../dtos/PageViewDTO'

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