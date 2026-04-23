import { Injectable, Inject } from '@nestjs/common'
import type { IProjectReadRepository } from '../../../../domain/repositories/project/IProjectReadRepository'
import type { ProjectDTO } from '../../../dtos/ProjectDTO'

// =============================================================================
// GetPublishedProjectsQuery
// Returns summaries of all published projects — description empty string.
// description excluded at repository level — list views never render full text.
// O(n) — filtered by isPublished index, ordered by createdAt desc.
// =============================================================================
@Injectable()
export class GetPublishedProjectsQuery {
  constructor(
    @Inject('IProjectReadRepository')
    private readonly repo: IProjectReadRepository,
  ) {}

  async execute(): Promise<ProjectDTO[]> {
    const projects = await this.repo.findPublished()
    return projects.map((p) => ({
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
    }))
  }
}