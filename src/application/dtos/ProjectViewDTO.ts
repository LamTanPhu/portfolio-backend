// =============================================================================
// ProjectViewDTO
// Output shape for one project's view stats — admin dashboard.
//
// `daily[].date` is a day-only string (YYYY-MM-DD), not a full ISO
// timestamp: ProjectView.date is stored as a Date normalized to UTC
// midnight (one row per project per day), so a full timestamp would imply
// time-of-day precision that was never actually recorded. Ordered
// most-recent-first, matching IProjectViewRepository.findByProject().
// =============================================================================
export interface ProjectViewDTO {
    projectId: number
    totalViews: number
    daily: { date: string; count: number }[]
}
