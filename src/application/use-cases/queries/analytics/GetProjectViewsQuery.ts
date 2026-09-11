import { Inject, Injectable } from '@nestjs/common'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { IProjectViewRepository } from '../../../../domain/repositories/project/IProjectViewRepository'
import type { IProjectReadRepository } from '../../../../domain/repositories/project/IProjectReadRepository'
import type { ProjectViewDTO } from '../../../dtos/ProjectViewDTO'

// =============================================================================
// GetProjectViewsQuery
// Returns total + daily view breakdown for one project — admin only.
//
// Gap fix: IProjectViewRepository.getTotalViews() and findByProject() were
// implemented and unit-tested on the repository, but nothing in the
// application layer ever called them — project views were being recorded
// on every visit with no way to read them back through the API. This query
// is that missing read path.
//
// Existence check mirrors GetProjectBySlugQuery — an id that doesn't match
// a real project should 404, not silently return a zero-view stat block
// that looks like a project nobody has ever viewed.
// =============================================================================
@Injectable()
export class GetProjectViewsQuery {
    constructor(
        @Inject('IProjectViewRepository')
        private readonly viewRepo: IProjectViewRepository,

        @Inject('IProjectReadRepository')
        private readonly projectRepo: IProjectReadRepository,
    ) {}

    async execute(projectId: number): Promise<ProjectViewDTO> {
        const project = await this.projectRepo.findById(projectId)
        if (!project) {
            throw new NotFoundError(`Project not found: ${projectId}`)
        }

        const [totalViews, daily] = await Promise.all([
            this.viewRepo.getTotalViews(projectId),
            this.viewRepo.findByProject(projectId),
        ])

        return {
            projectId,
            totalViews,
            daily: daily.map((v) => ({
                date: v.date.toISOString().slice(0, 10),
                count: v.count,
            })),
        }
    }
}
