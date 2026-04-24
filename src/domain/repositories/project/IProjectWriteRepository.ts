import type { Project } from '../../entities/Project'

// =============================================================================
// CreateProjectInput
// slug auto-generated from name — never accepted from client.
// userId from verified JWT payload — never accepted from client.
// =============================================================================
export interface CreateProjectInput {
  name:         string
  description:  string
  slug:         string
  techStack:    string[]
  repoUrl:      string | null
  liveUrl:      string | null
  thumbnailUrl: string | null
  isPublished:  boolean
  isOpenSource: boolean
  userId:       number
}

// =============================================================================
// UpdateProjectInput
// All fields optional — PATCH semantics.
// techStack replaced in full when provided — partial updates not supported.
// =============================================================================
export interface UpdateProjectInput {
  name?:         string
  description?:  string
  slug?:         string
  techStack?:    string[]
  repoUrl?:      string | null
  liveUrl?:      string | null
  thumbnailUrl?: string | null
  isPublished?:  boolean
  isOpenSource?: boolean
}

// =============================================================================
// IProjectWriteRepository
// Write interface for Project aggregate — separated from read per ISP.
// =============================================================================
export interface IProjectWriteRepository {
  create(data: CreateProjectInput): Promise<Project>
  update(id: number, data: UpdateProjectInput): Promise<Project>
  delete(id: number): Promise<void>
}