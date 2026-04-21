import { Blog } from '../../entities/Blog'

export interface IBlogReadRepository {
  findAll(): Promise<Blog[]>
  findPublished(): Promise<Blog[]>
  findById(id: number): Promise<Blog | null>
  findBySlug(slug: string): Promise<Blog | null>
}