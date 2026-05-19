/**
 * @fileoverview JobModule
 * 
 * Manages work experience records (public view + admin CRUD).
 * Uses split Read/Write repositories and proper caching.
 */

import { Module } from '@nestjs/common'
import { CacheInfrastructureModule } from '../../../infrastructure/cache/cache.module'
import { AuthModule } from '../auth/auth.module'

import { JobController } from './job.controller'

// Use Cases
import { CreateJobCommand } from '../../../application/use-cases/commands/job/CreateJobCommand'
import { DeleteJobCommand } from '../../../application/use-cases/commands/job/DeleteJobCommand'
import { UpdateJobCommand } from '../../../application/use-cases/commands/job/UpdateJobCommand'
import { GetJobsQuery } from '../../../application/use-cases/queries/skill/jobs/GetJobsQuery'

// Repositories
import { PrismaJobReadRepository } from '../../../infrastructure/database/repositories/job/PrismaJobReadRepository'
import { PrismaJobWriteRepository } from '../../../infrastructure/database/repositories/job/PrismaJobWriteRepository'

@Module({
    imports: [
        AuthModule,
        CacheInfrastructureModule,
    ],

    controllers: [JobController],

    providers: [
        // Repositories
        PrismaJobReadRepository,
        PrismaJobWriteRepository,

        // Ports
        { provide: 'IJobReadRepository', useExisting: PrismaJobReadRepository },
        { provide: 'IJobWriteRepository', useExisting: PrismaJobWriteRepository },

        // Use Cases
        GetJobsQuery,
        CreateJobCommand,
        UpdateJobCommand,
        DeleteJobCommand,
    ],
})
export class JobModule {}