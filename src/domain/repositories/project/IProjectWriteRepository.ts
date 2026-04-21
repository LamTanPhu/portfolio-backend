import { Project } from '../../entities/Project'

export interface CreateProjectInput {
  name: string
  description: string
  slug: string
  techStack: string[]
  repoUrl: string | null
  liveUrl: string | null
  thumbnailUrl: string | null
  isPublished: boolean
  isOpenSource: boolean
  userId: number
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  slug?: string
  techStack?: string[]
  repoUrl?: string | null
  liveUrl?: string | null
  thumbnailUrl?: string | null
  isPublished?: boolean
  isOpenSource?: boolean
}

export interface IProjectWriteRepository {
  create(data: CreateProjectInput): Promise<Project>
  update(id: number, data: UpdateProjectInput): Promise<Project>
  delete(id: number): Promise<void>
}