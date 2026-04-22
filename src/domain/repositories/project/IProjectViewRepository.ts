import type { ProjectView } from '../../entities/ProjectView'

// =============================================================================
// IProjectViewRepository
// Write-mostly — increments daily view counter per project.
// Read used by analytics endpoints — total views, views by date range.
// =============================================================================
export interface IProjectViewRepository {
    // Atomically increment today's view count for a project
    increment(projectId: number): Promise<void>

    // Total view count across all days for a project
    getTotalViews(projectId: number): Promise<number>

    // All daily view records for a project — enables charting
    findByProject(projectId: number): Promise<ProjectView[]>
}