// =============================================================================
// ProjectDTO
// Output shape for project data crossing application layer boundary.
// description empty string on list queries — only populated on single project fetch.
// techStack flattened from JSONB — always string[] in application layer.
// Dates serialized as ISO 8601 strings — domain Date objects never cross layers.
// =============================================================================
export interface ProjectDTO {
  id:           number
  name:         string
  description:  string       // empty string on list queries — see PrismaProjectRepository
  slug:         string
  techStack:    string[]
  repoUrl:      string | null
  liveUrl:      string | null
  thumbnailUrl: string | null
  isPublished:  boolean
  isOpenSource: boolean
  createdAt:    string
  updatedAt:    string
}