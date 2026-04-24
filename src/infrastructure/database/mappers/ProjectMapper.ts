import type { Project as PrismaProject } from '@prisma/client'
import { Project } from '../../../domain/entities/Project'
import type { CreateProjectInput } from '../../../domain/repositories/project/IProjectWriteRepository'

// =============================================================================
// ProjectMapper
// Converts between Prisma Project model and domain Project entity.
// Static methods — no state, no dependencies, fully testable.
// techStack stored as JSONB — Prisma returns it already parsed as unknown.
// Cast to string[] is safe — schema enforces the array shape at write time.
// =============================================================================
export class ProjectMapper {
  // Prisma model → Domain entity
  static toDomain(raw: PrismaProject): Project {
    return new Project(
      raw.id,
      raw.name,
      raw.description,
      raw.slug,
      // techStack is JSONB — already parsed by Prisma, never use JSON.parse
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

  // Domain input → Prisma create/update shape
  static toPrisma(data: CreateProjectInput) {
    return {
      name:         data.name,
      description:  data.description,
      slug:         data.slug,
      // Pass array directly — Prisma serializes JSONB automatically
      techStack:    data.techStack,
      repoUrl:      data.repoUrl,
      liveUrl:      data.liveUrl,
      thumbnailUrl: data.thumbnailUrl,
      isPublished:  data.isPublished,
      isOpenSource: data.isOpenSource,
      userId:       data.userId,
    }
  }
}