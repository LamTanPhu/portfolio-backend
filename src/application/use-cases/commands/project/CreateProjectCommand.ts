import { Injectable } from '@nestjs/common'
import type { IProjectWriteRepository } from '../../../../domain/repositories/project/IProjectWriteRepository'
import type { ProjectDTO } from '../../../dtos/ProjectDTO'
import { Slug } from '../../../../domain/value-objects/Slug'

interface Input {
  name: string
  description: string
  techStack: string[]
  repoUrl: string | null
  liveUrl: string | null
  thumbnailUrl: string | null
  isOpenSource: boolean
  isPublished: boolean
  userId: number
}

@Injectable()
export class CreateProjectCommand {
  constructor(private readonly repo: IProjectWriteRepository) {}

  async execute(input: Input): Promise<ProjectDTO> {
    const slug = Slug.from(input.name)

    const project = await this.repo.create({
      name: input.name,
      description: input.description,
      slug: slug.toString(),
      techStack: input.techStack,
      repoUrl: input.repoUrl,
      liveUrl: input.liveUrl,
      thumbnailUrl: input.thumbnailUrl,
      isOpenSource: input.isOpenSource,
      isPublished: input.isPublished,
      userId: input.userId,
    })

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