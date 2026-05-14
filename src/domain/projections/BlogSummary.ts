// src/domain/projections/BlogSummary.ts

// =============================================================================
// BlogSummary
// Lightweight read projection for blog list queries.
// Used for public listings and admin tables.
// Full content intentionally excluded for performance.
//
// Unlike BlogDTO:
// - dates remain native Date objects
// - projection is backend-internal
// - not tied to HTTP/API serialization
// =============================================================================
export interface BlogSummary {
    id:          number
    title:       string
    slug:        string
    excerpt:     string | null
    tags:        string[]
    isPublished: boolean
    publishedAt: Date | null
    createdAt:   Date
}