// =============================================================================
// PageViewDTO
// Output shape for analytics page view data.
// Dates serialized as ISO 8601 strings — domain Date objects never cross layers.
// =============================================================================
export interface PageViewDTO {
    route:        string
    count:        number
    lastViewedAt: string
}