import type { ProjectView } from '../../entities/ProjectView'

// =============================================================================
// IProjectViewRepository
// Daily bucketed view counter owned by Project aggregate.
// increment uses upsert on [projectId, date] composite unique key — O(1), atomic.
// getTotalViews uses DB aggregate — never sums rows in application layer.
// findByProject enables time-series charting in admin dashboard.
// =============================================================================
export interface IProjectViewRepository {
    // Atomically increment today's view count — creates row if first visit today
    increment(projectId: number): Promise<void>

    // Total view count across all days — single aggregate query, O(1)
    getTotalViews(projectId: number): Promise<number>

    // All daily records — enables views-over-time charts in admin dashboard
    findByProject(projectId: number): Promise<ProjectView[]>
}