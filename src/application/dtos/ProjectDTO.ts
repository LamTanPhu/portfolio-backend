export interface ProjectDTO {
  id: number
  name: string
  description: string
  slug: string
  techStack: string[]
  repoUrl: string | null
  liveUrl: string | null
  thumbnailUrl: string | null
  isOpenSource: boolean
  createdAt: string
  updatedAt: string
}