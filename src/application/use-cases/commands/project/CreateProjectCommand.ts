import { Injectable, Inject } from '@nestjs/common'
import type { IProjectWriteRepository } from '../../../../domain/repositories/project/IProjectWriteRepository'
import type { ProjectDTO } from '../../../dtos/ProjectDTO'
import { Slug } from '../../../../domain/value-objects/Slug'

// =============================================================================
// CreateProjectCommand Input
// =============================================================================
interface Input {
  name:         string
  description:  string
  techStack:    string[]
  repoUrl:      string | null
  liveUrl:      string | null
  thumbnailUrl: string | null
  isOpenSource: boolean
  isPublished:  boolean
  userId:       number
}

// =============================================================================
// CreateProjectCommand
// Single responsibility: validate slug, persist project, return DTO.
// slug auto-generated from name via Slug value object — never trusted from client.
// userId comes from verified JWT payload — never trusted from client.
// =============================================================================
@Injectable()
export class CreateProjectCommand {
  constructor(
    @Inject('IProjectWriteRepository')
    private readonly repo: IProjectWriteRepository,
  ) {}

  async execute(input: Input): Promise<ProjectDTO> {
    // Slug auto-generated from name — ValidationError thrown if name is empty
    const slug = Slug.from(input.name)

    const project = await this.repo.create({
      name:         input.name,
      description:  input.description,
      slug:         slug.toString(),
      techStack:    input.techStack,
      repoUrl:      input.repoUrl,
      liveUrl:      input.liveUrl,
      thumbnailUrl: input.thumbnailUrl,
      isOpenSource: input.isOpenSource,
      isPublished:  input.isPublished,
      userId:       input.userId,
    })

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