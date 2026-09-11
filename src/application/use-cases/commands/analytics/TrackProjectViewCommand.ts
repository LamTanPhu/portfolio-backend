import { Injectable, Inject } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { IProjectViewRepository } from '../../../../domain/repositories/project/IProjectViewRepository'
import type { IProjectReadRepository } from '../../../../domain/repositories/project/IProjectReadRepository'

// =============================================================================
// TrackProjectViewCommand
// Increments daily view counter for a specific project.
// Called when a visitor opens a project detail page.
// Daily bucketing in repository — O(1) upsert, never unbounded row growth.
//
// Existence check (gap fix): ProjectView.projectId carries a real FK
// constraint (onDelete: Cascade) in the schema. Previously this command
// called repo.increment() directly — an invalid id hit that FK constraint
// at the DB layer as a raw Prisma error, which DomainExceptionFilter
// (scoped to @Catch(DomainError)) never saw, so it fell through to Nest's
// generic 500 handler instead of a clean 404. Checking existence first
// keeps this write on the same domain-error path as every other command
// in the app.
// =============================================================================
@Injectable()
export class TrackProjectViewCommand {
    constructor(
        @Inject('IProjectViewRepository')
        private readonly repo: IProjectViewRepository,

        @Inject('IProjectReadRepository')
        private readonly projectRepo: IProjectReadRepository,
    ) {}

    async execute(projectId: number): Promise<void> {
        const project = await this.projectRepo.findById(projectId)
        if (!project) {
            throw new NotFoundError(`Project not found: ${projectId}`)
        }

        await this.repo.increment(projectId)
    }
}
