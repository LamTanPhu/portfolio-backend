import { Injectable, Inject } from '@nestjs/common'
import type { IPageViewRepository } from '../../../../domain/repositories/analytics/IPageViewRepository'

// =============================================================================
// TrackPageViewCommand
// Increments per-route view counter — called on every page load.
// Upsert pattern in repository — O(1), atomic, no race condition.
// =============================================================================
@Injectable()
export class TrackPageViewCommand {
    constructor(
        @Inject('IPageViewRepository')
        private readonly repo: IPageViewRepository,
    ) {}

    async execute(route: string): Promise<void> {
        await this.repo.increment(route)
    }
}