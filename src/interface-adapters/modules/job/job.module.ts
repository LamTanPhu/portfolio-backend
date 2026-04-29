import { Module } from '@nestjs/common'
import { CreateJobCommand } from '../../../application/use-cases/commands/job/CreateJobCommand'
import { DeleteJobCommand } from '../../../application/use-cases/commands/job/DeleteJobCommand'
import { UpdateJobCommand } from '../../../application/use-cases/commands/job/UpdateJobCommand'
import { GetJobsQuery } from '../../../application/use-cases/queries/skill/jobs/GetJobsQuery'
import { PrismaJobRepository } from '../../../infrastructure/database/repositories/PrismaJobRepository'
import { AuthModule } from '../auth/auth.module'
import { JobController } from './job.controller'

// =============================================================================
// JobModule
// AuthModule imported — JwtAuthGuard on admin endpoints needs AuthService.
// PrismaJobRepository implements both read and write interfaces.
// =============================================================================
@Module({
    imports: [AuthModule],
    controllers: [JobController],
    providers: [
        // ─── Repositories ───────────────────────────────────────────────────────
        PrismaJobRepository,
        { provide: 'IJobReadRepository',  useExisting: PrismaJobRepository },
        { provide: 'IJobWriteRepository', useExisting: PrismaJobRepository },

        // ─── Use cases ──────────────────────────────────────────────────────────
        {
            provide:    GetJobsQuery,
            useFactory: (repo: PrismaJobRepository) => new GetJobsQuery(repo),
            inject:     [PrismaJobRepository],
        },
        {
            provide:    CreateJobCommand,
            useFactory: (repo: PrismaJobRepository) => new CreateJobCommand(repo),
            inject:     [PrismaJobRepository],
        },
        {
            provide:    UpdateJobCommand,
            useFactory: (repo: PrismaJobRepository) => new UpdateJobCommand(repo),
            inject:     [PrismaJobRepository],
        },
        {
            provide:    DeleteJobCommand,
            useFactory: (repo: PrismaJobRepository) => new DeleteJobCommand(repo),
            inject:     [PrismaJobRepository],
        },
    ],
})
export class JobModule {}