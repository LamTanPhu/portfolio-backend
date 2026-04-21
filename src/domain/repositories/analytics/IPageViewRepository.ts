import { PageView } from '../../entities/PageView'

export interface IPageViewRepository {
  increment(route: string): Promise<void>
  findByRoute(route: string): Promise<PageView | null>
  findAll(): Promise<PageView[]>
}