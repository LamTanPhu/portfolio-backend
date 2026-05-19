/**
 * @fileoverview GetJobsQuery
 * 
 * Public query returning all work experience records.
 * Uses LONG cache profile (work experience changes infrequently).
 */

import { Inject, Injectable } from '@nestjs/common'
import type { IJobReadRepository } from '../../../../../domain/repositories/job/IJobReadRepository'
import { JobDTO } from '../../../../dtos/JobDTO'
import type { ICacheQueryService } from '../../../../ports/ICacheQueryService'


@Injectable()
export class GetJobsQuery {
    constructor(
        @Inject('IJobReadRepository')
        private readonly repo: IJobReadRepository,

        @Inject('ICacheQueryService')
        private readonly cacheQuery: ICacheQueryService,
    ) {}

    async execute(): Promise<JobDTO[]> {
        return this.cacheQuery.getOrSetWithProfile(
        'job:list:public',
        'LONG',
        async () => {
            const jobs = await this.repo.findAll()
            return jobs
        },
        )
    }
}