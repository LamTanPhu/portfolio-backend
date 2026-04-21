import { Project } from '../../entities/Project'

export interface IProjectReadRepository {
  findAll(): Promise<Project[]>
  findPublished(): Promise<Project[]>
  findById(id: number): Promise<Project | null>
  findBySlug(slug: string): Promise<Project | null>
}
