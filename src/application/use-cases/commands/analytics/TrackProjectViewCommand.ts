import { Inject, Injectable } from '@nestjs/common'
import type { IProjectViewRepository } from '../../../../domain/repositories/project/IProjectViewRepository'

// =============================================================================
// TrackProjectViewCommand
// Increments daily view counter for a project.
// Called when a visitor views a project detail page.
// Uses daily bucketing — O(1) upsert, never unbounded row growth.
// =============================================================================
@Injectable()
export class TrackProjectViewCommand {
    constructor(
        @Inject('IProjectViewRepository')
        private readonly repo: IProjectViewRepository,
    ) {}

    async execute(projectId: number): Promise<void> {
        await this.repo.increment(projectId)
    }
}