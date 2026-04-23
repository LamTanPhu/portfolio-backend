import { Injectable, Inject } from '@nestjs/common'
import type { IProjectViewRepository } from '../../../../domain/repositories/project/IProjectViewRepository'

// =============================================================================
// TrackProjectViewCommand
// Increments daily view counter for a specific project.
// Called when a visitor opens a project detail page.
// Daily bucketing in repository — O(1) upsert, never unbounded row growth.
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