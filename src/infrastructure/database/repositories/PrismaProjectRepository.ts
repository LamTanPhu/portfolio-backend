import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { IProjectReadRepository } from '../../../domain/repositories/project/IProjectReadRepository'
import type {
  IProjectWriteRepository,
  CreateProjectInput,
  UpdateProjectInput,
} from '../../../domain/repositories/project/IProjectWriteRepository'
import { Project } from '../../../domain/entities/Project'
import { ProjectMapper } from '../mappers/ProjectMapper'

type PrismaProject = Prisma.ProjectGetPayload<Record<string, never>>

// Summary select — excludes description for list queries
// description can be long — no need to fetch for grid/card views
const LIST_SELECT = {
  id:           true,
  name:         true,
  slug:         true,
  techStack:    true,
  repoUrl:      true,
  liveUrl:      true,
  thumbnailUrl: true,
  isPublished:  true,
  isOpenSource: true,
  userId:       true,
  createdAt:    true,
  updatedAt:    true,
  description:  false,
} as const

type PrismaProjectSummary = Prisma.ProjectGetPayload<{
  select: typeof LIST_SELECT
}>

// =============================================================================
// PrismaProjectRepository
// =============================================================================
@Injectable()
export class PrismaProjectRepository
  implements IProjectReadRepository, IProjectWriteRepository
{
  constructor(private readonly prisma: PrismaService) {}

  // Full mapper — used for single-item and write operations
  private static toDomain(raw: PrismaProject): Project {
    return ProjectMapper.toDomain(raw)
  }

  // Summary mapper — description substituted with empty string for list views
  private static toDomainSummary(raw: PrismaProjectSummary): Project {
    return new Project(
      raw.id,
      raw.name,
      '',           // description not fetched — card views never render full description
      raw.slug,
      raw.techStack as string[],
      raw.repoUrl,
      raw.liveUrl,
      raw.thumbnailUrl,
      raw.isPublished,
      raw.isOpenSource,
      raw.userId,
      raw.createdAt,
      raw.updatedAt,
    )
  }

  // ===========================================================================
  // Read Operations
  // ===========================================================================

  async findAll(): Promise<Project[]> {
    const rows = await this.prisma.client.project.findMany({
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(PrismaProjectRepository.toDomainSummary)
  }

  async findPublished(): Promise<Project[]> {
    const rows = await this.prisma.client.project.findMany({
      where: { isPublished: true },
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(PrismaProjectRepository.toDomainSummary)
  }

  // Full fetch — detail page needs description
  async findById(id: number): Promise<Project | null> {
    const row = await this.prisma.client.project.findUnique({ where: { id } })
    return row ? PrismaProjectRepository.toDomain(row) : null
  }

  // Full fetch — detail page needs description
  async findBySlug(slug: string): Promise<Project | null> {
    const row = await this.prisma.client.project.findUnique({ where: { slug } })
    return row ? PrismaProjectRepository.toDomain(row) : null
  }

  // ===========================================================================
  // Write Operations
  // ===========================================================================

  async create(data: CreateProjectInput): Promise<Project> {
    const row = await this.prisma.client.project.create({
      data: ProjectMapper.toPrisma(data),
    })
    return PrismaProjectRepository.toDomain(row)
  }

  async update(id: number, data: UpdateProjectInput): Promise<Project> {
    const row = await this.prisma.client.project.update({
      where: { id },
      data: {
        ...data,
        techStack: data.techStack ?? undefined,
      },
    })
    return PrismaProjectRepository.toDomain(row)
  }

  async delete(id: number): Promise<void> {
    await this.prisma.client.project.delete({ where: { id } })
  }
}