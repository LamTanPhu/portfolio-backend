import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { IProjectReadRepository } from '../../../domain/repositories/project/IProjectReadRepository'
import type {
  IProjectWriteRepository,
  CreateProjectInput,
  UpdateProjectInput,
} from '../../../domain/repositories/project/IProjectWriteRepository'
import { Project } from '../../../domain/entities/Project'
import { ProjectMapper } from '../mappers/ProjectMapper'
import { NotFoundError } from '../../../domain/errors/NotFoundError'

type PrismaProject = Prisma.ProjectGetPayload<Record<string, never>>

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
// Implements both read and write interfaces for Project aggregate.
// List queries exclude description — card views never render full description.
// Write operations catch P2025 — eliminates read-before-write round trip.
// O(1) update/delete — single query instead of findById + mutate.
// =============================================================================
@Injectable()
export class PrismaProjectRepository
  implements IProjectReadRepository, IProjectWriteRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private static toDomain(raw: PrismaProject): Project {
    return ProjectMapper.toDomain(raw)
  }

  private static toDomainSummary(raw: PrismaProjectSummary): Project {
    return new Project(
      raw.id,
      raw.name,
      '',
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
      select:  LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(PrismaProjectRepository.toDomainSummary)
  }

  async findPublished(): Promise<Project[]> {
    const rows = await this.prisma.client.project.findMany({
      where:   { isPublished: true },
      select:  LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(PrismaProjectRepository.toDomainSummary)
  }

  async findById(id: number): Promise<Project | null> {
    const row = await this.prisma.client.project.findUnique({ where: { id } })
    return row ? PrismaProjectRepository.toDomain(row) : null
  }

  async findBySlug(slug: string): Promise<Project | null> {
    const row = await this.prisma.client.project.findUnique({ where: { slug } })
    return row ? PrismaProjectRepository.toDomain(row) : null
  }

  // ===========================================================================
  // Write Operations
  // P2025 caught at repository level — use cases stay clean of Prisma knowledge
  // ===========================================================================

  async create(data: CreateProjectInput): Promise<Project> {
    const row = await this.prisma.client.project.create({
      data: ProjectMapper.toPrisma(data),
    })
    return PrismaProjectRepository.toDomain(row)
  }

  async update(id: number, data: UpdateProjectInput): Promise<Project> {
    try {
      const row = await this.prisma.client.project.update({
        where: { id },
        data:  { ...data, techStack: data.techStack ?? undefined },
      })
      return PrismaProjectRepository.toDomain(row)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundError(`Project not found: ${id}`)
      }
      throw error
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.client.project.delete({ where: { id } })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundError(`Project not found: ${id}`)
      }
      throw error
    }
  }
}