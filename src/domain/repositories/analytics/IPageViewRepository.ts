import type { PageView } from '../../entities/PageView'

// =============================================================================
// IPageViewRepository
// Per-route view counter — one record per unique route.
// increment uses upsert — atomic, O(1), no race condition.
// findByRoute used to check existence before operations.
// findAll used by admin analytics endpoint — ordered by count desc.
// =============================================================================
export interface IPageViewRepository {
  increment(route: string): Promise<void>
  findByRoute(route: string): Promise<PageView | null>
  findAll(): Promise<PageView[]>
}