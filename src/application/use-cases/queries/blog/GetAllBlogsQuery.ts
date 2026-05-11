import { Injectable, Inject } from '@nestjs/common'
import type { IBlogReadRepository } from '../../../../domain/repositories/blog/IBlogReadRepository'
import type { BlogDTO } from '../../../dtos/BlogDTO'

// =============================================================================
// GetAllBlogsQuery
// Admin only — returns all blogs (including drafts).
// No mapping needed after repository optimization.
// =============================================================================
@Injectable()
export class GetAllBlogsQuery {
    constructor(
        @Inject('IBlogReadRepository')
        private readonly repo: IBlogReadRepository,
    ) {}

    async execute(): Promise<BlogDTO[]> {
        return this.repo.findAll()
    }
}