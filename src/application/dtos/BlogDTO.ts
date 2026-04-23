// =============================================================================
// BlogDTO
// Output shape for blog post data crossing application layer boundary.
// content empty string on list queries — only populated on single post fetch.
// tags flattened to string[] — BlogTag entity never crosses application boundary.
// Dates serialized as ISO 8601 strings — domain Date objects never cross layers.
// =============================================================================
export interface BlogDTO {
  id:          number
  title:       string
  slug:        string
  content:     string       // empty string on list queries — see PrismaBlogRepository
  excerpt:     string | null
  tags:        string[]
  isPublished: boolean
  publishedAt: string | null
  createdAt:   string
}