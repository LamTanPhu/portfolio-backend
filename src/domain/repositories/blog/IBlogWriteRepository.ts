import { Blog } from '../../entities/Blog'

export interface CreateBlogInput {
  title: string
  slug: string
  content: string
  excerpt: string | null
  tags: string[]
  isPublished: boolean
  publishedAt: Date | null
  userId: number
}

export interface UpdateBlogInput {
  title?: string
  slug?: string
  content?: string
  excerpt?: string | null
  tags?: string[]
  isPublished?: boolean
  publishedAt?: Date | null
}

export interface IBlogWriteRepository {
  create(data: CreateBlogInput): Promise<Blog>
  update(id: number, data: UpdateBlogInput): Promise<Blog>
  delete(id: number): Promise<void>
}