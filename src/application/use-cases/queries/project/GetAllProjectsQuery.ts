/**
 * @fileoverview GetAllProjectsQuery
 *
 * Admin-only query that returns every project summary, drafts included.
 * Mirrors GetAllBlogsQuery: no caching (admin views need absolute freshness)
 * and no authorization of its own — the controller route is JWT-guarded.
 *
 * Before this existed the admin project list could only show PUBLISHED
 * projects, so a draft was unreachable from the UI once created.
 */

import { Inject, Injectable } from '@nestjs/common'
import type { IProjectReadRepository } from '../../../../domain/repositories/project/IProjectReadRepository'
import type { ProjectSummaryDTO } from '../../../dtos/ProjectDTO'

@Injectable()
export class GetAllProjectsQuery {
    constructor(
        @Inject('IProjectReadRepository')
        private readonly repo: IProjectReadRepository,
    ) {}

    async execute(): Promise<ProjectSummaryDTO[]> {
        return this.repo.findAll()
    }
}
