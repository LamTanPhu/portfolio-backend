import { Injectable, Inject } from '@nestjs/common'
import type { IProjectReadRepository } from '../../../../domain/repositories/project/IProjectReadRepository'
import type { ProjectDTO } from '../../../dtos/ProjectDTO'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'

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
      id: project.id,
      name: project.name,
      description: project.description,
      slug: project.slug,
      techStack: project.techStack,
      repoUrl: project.repoUrl,
      liveUrl: project.liveUrl,
      thumbnailUrl: project.thumbnailUrl,
      isOpenSource: project.isOpenSource,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    }
  }
}