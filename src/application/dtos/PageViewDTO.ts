// =============================================================================
// PageViewDTO
// Output shape for analytics page view data.
// =============================================================================
export interface PageViewDTO {
    route:        string
    count:        number
    lastViewedAt: string
}