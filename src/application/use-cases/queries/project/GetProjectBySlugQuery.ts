import { Injectable, Inject } from '@nestjs/common'
import type { IProjectReadRepository } from '../../../../domain/repositories/project/IProjectReadRepository'
import type { ProjectDTO } from '../../../dtos/ProjectDTO'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'

// =============================================================================
// GetProjectBySlugQuery
// Returns full project by slug — includes description and all fields.
// Slug is unique indexed — O(1) lookup guaranteed.
// Throws NotFoundError if slug does not exist — mapped to 404 by DomainExceptionFilter.
// =============================================================================
@Injectable()
export class GetProjectBySlugQuery {
  constructor(
    @Inject('IProjectReadRepository')
    private readonly repo: IProjectReadRepository,
  ) {}

  async execute(slug: string): Promise<ProjectDTO> {
    const project = await this.repo.findBySlug(slug)
    if (!project) throw new NotFoundError(`Project not found: ${slug}`)

    return {
      id:           project.id,
      name:         project.name,
      description:  project.description,
      slug:         project.slug,
      techStack:    project.techStack,
      repoUrl:      project.repoUrl,
      liveUrl:      project.liveUrl,
      thumbnailUrl: project.thumbnailUrl,
      isPublished:  project.isPublished,
      isOpenSource: project.isOpenSource,
      createdAt:    project.createdAt.toISOString(),
      updatedAt:    project.updatedAt.toISOString(),
    }
  }
}