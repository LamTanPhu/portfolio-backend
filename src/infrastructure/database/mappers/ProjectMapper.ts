import { Project as PrismaProject } from '@prisma/client'
import { Project } from '../../../domain/entities/Project'
import { CreateProjectInput } from '../../../domain/repositories/project/IProjectWriteRepository'

export class ProjectMapper {
  static toDomain(raw: PrismaProject): Project {
    return new Project(
      raw.id,
      raw.name,
      raw.description,
      raw.slug,
      // techStack is JSONB — Prisma returns it already parsed, never use JSON.parse
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

  static toPrisma(data: CreateProjectInput) {
    return {
      name: data.name,
      description: data.description,
      slug: data.slug,
      // Store as JSONB — pass array directly, Prisma handles serialization
      techStack: data.techStack,
      repoUrl: data.repoUrl,
      liveUrl: data.liveUrl,
      thumbnailUrl: data.thumbnailUrl,
      isPublished: data.isPublished,
      isOpenSource: data.isOpenSource,
      userId: data.userId,
    }
  }
}