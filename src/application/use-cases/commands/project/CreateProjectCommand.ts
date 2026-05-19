/**
 * @fileoverview CreateProjectCommand
 * 
 * Creates a new project record.
 * Slug is auto-generated from name using Slug value object.
 * userId comes from verified JWT payload.
 */

import { Injectable, Inject } from '@nestjs/common'
import type { IProjectWriteRepository } from '../../../../domain/repositories/project/IProjectWriteRepository'
import type { ICacheInvalidationService } from '../../../ports/ICacheInvalidationService'
import { Slug } from '../../../../domain/value-objects/Slug'
import type { ProjectDTO } from '../../../dtos/ProjectDTO'

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

@Injectable()
export class CreateProjectCommand {
  constructor(
    @Inject('IProjectWriteRepository')
    private readonly repo: IProjectWriteRepository,

    @Inject('ICacheInvalidationService')
    private readonly cacheService: ICacheInvalidationService,
  ) {}

  async execute(input: Input): Promise<ProjectDTO> {
    const slug = Slug.from(input.name)

    const project = await this.repo.create({
      name:         input.name,
      description:  input.description,
      slug:         slug.toString(),
      techStack:    input.techStack,
      repoUrl:      input.repoUrl,
      liveUrl:      input.liveUrl,
      thumbnailUrl: input.thumbnailUrl,
      isPublished:  input.isPublished,
      isOpenSource: input.isOpenSource,
      userId:       input.userId,
    })

    // Invalidate caches
    await this.cacheService.invalidatePublicProjects()
    await this.cacheService.invalidateProjectBySlug(slug.toString())

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