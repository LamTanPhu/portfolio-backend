import { Injectable } from '@nestjs/common'
import type { IPageViewRepository } from '../../../../domain/repositories/analytics/IPageViewRepository'

export interface PageViewDTO {
    route: string
    count: number
    lastViewedAt: string
}

@Injectable()
export class GetPageViewsQuery {
    constructor(private readonly repo: IPageViewRepository) {}

    async execute(): Promise<PageViewDTO[]> {
        const views = await this.repo.findAll()
        return views.map((v) => ({
        route: v.route,
        count: v.count,
        lastViewedAt: v.lastViewedAt.toISOString(),
        }))
    }
}