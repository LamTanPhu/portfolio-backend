export interface BlogSummaryDTO {
    id: number
    title: string
    slug: string
    excerpt: string | null
    tags: string[]
    isPublished: boolean
    publishedAt: string | null
    createdAt: string
}
