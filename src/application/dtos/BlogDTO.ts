export interface BlogDTO {
  id: number
  title: string
  slug: string
  content: string
  excerpt: string | null
  tags: string[]
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
}