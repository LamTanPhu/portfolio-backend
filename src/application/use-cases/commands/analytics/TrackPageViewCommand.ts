import { Injectable } from '@nestjs/common'
import type { IPageViewRepository } from '../../../../domain/repositories/analytics/IPageViewRepository'

@Injectable()
export class TrackPageViewCommand {
    constructor(private readonly repo: IPageViewRepository) {}

    async execute(route: string): Promise<void> {
        await this.repo.increment(route)
    }
}