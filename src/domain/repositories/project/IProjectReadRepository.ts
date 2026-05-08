import { ProjectDTO } from '../../../application/dtos/ProjectDTO'
import type { Project } from '../../entities/Project'

// =============================================================================
// IProjectReadRepository
// Read interface for Project aggregate — separated from write per ISP.
// findAll returns all projects — admin use only.
// findPublished returns summaries — description excluded at repository level.
// findById and findBySlug return full project including description.
// =============================================================================
export interface IProjectReadRepository {
  findAll(): Promise<ProjectDTO[]>
  findPublished(): Promise<ProjectDTO[]>
  findById(id: number): Promise<Project | null>
  findBySlug(slug: string): Promise<Project | null>
}