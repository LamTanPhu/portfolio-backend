import { Injectable, Inject } from '@nestjs/common'
import type { IProjectReadRepository } from '../../../../domain/repositories/project/IProjectReadRepository'
import type { ProjectDTO } from '../../../dtos/ProjectDTO'
import { CacheTTL } from '@nestjs/cache-manager/dist/decorators/cache-ttl.decorator'
import { CacheKey } from '@nestjs/cache-manager/dist/decorators/cache-key.decorator'

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

  @CacheKey('public_projects')
  @CacheTTL(600_000)
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
      createdAt:    p.createdAt.toString(),
      updatedAt:    p.updatedAt.toString(),
    }))
  }
}