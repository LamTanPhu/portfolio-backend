// =============================================================================
// ProjectDTO — two variants, one honest type per use-case
//
// ProjectSummaryDTO  — list queries (GET /projects)
//   description is OMITTED entirely — not fetched from DB, saves bandwidth.
//
// ProjectDTO         — single-item queries (GET /projects/:slug)
//   description is always present and populated.
//
// Previously there was one type with `description: string` and a code comment
// saying "empty on list queries". That made the type contract lie to consumers
// (TypeScript said description was always a string, but it was silently empty).
// =============================================================================

export interface ProjectSummaryDTO {
  id:           number
  name:         string
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

export interface ProjectDTO extends ProjectSummaryDTO {
  description: string
}