import { Inject, Injectable } from '@nestjs/common'
import type {
    IProjectWriteRepository,
    UpdateProjectInput,
} from '../../../../domain/repositories/project/IProjectWriteRepository'
import type { ProjectDTO } from '../../../dtos/ProjectDTO'

interface Input extends UpdateProjectInput {
    id: number
}

// =============================================================================
// UpdateProjectCommand
// NotFoundError thrown by repository if id does not exist — no pre-check needed.
// O(1) — single DB query, no read-before-write.
// =============================================================================
@Injectable()
export class UpdateProjectCommand {
    constructor(
        @Inject('IProjectWriteRepository')
        private readonly repo: IProjectWriteRepository,
    ) {}

    async execute(input: Input): Promise<ProjectDTO> {
        const { id, ...data } = input
        const p = await this.repo.update(id, data)
        return {
        id:           p.id,
        name:         p.name,
        description:  p.description,
        slug:         p.slug,
        techStack:    p.techStack,
        repoUrl:      p.repoUrl,
        liveUrl:      p.liveUrl,
        thumbnailUrl: p.thumbnailUrl,
        isPublished:  p.isPublished,
        isOpenSource: p.isOpenSource,
        createdAt:    p.createdAt.toISOString(),
        updatedAt:    p.updatedAt.toISOString(),
        }
    }
}