import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ProjectModule } from '../project/project.module'
import { AnalyticsController } from './analytics.controller'
import { GetPageViewsQuery } from '../../../application/use-cases/queries/analytics/GetPageViewsQuery'
import { GetProjectViewsQuery } from '../../../application/use-cases/queries/analytics/GetProjectViewsQuery'
import { TrackPageViewCommand } from '../../../application/use-cases/commands/analytics/TrackPageViewCommand'
import { TrackProjectViewCommand } from '../../../application/use-cases/commands/analytics/TrackProjectViewCommand'
import { TrackResumeDownloadCommand } from '../../../application/use-cases/commands/analytics/TrackResumeDownloadCommand'
import { PrismaPageViewRepository } from '../../../infrastructure/database/repositories/PrismaPageViewRepository'
import { PrismaProjectViewRepository } from '../../../infrastructure/database/repositories/PrismaProjectViewRepository'
import { PrismaResumeDownloadRepository } from '../../../infrastructure/database/repositories/PrismaResumeDownloadRepository'
import type { IProjectReadRepository } from '../../../domain/repositories/project/IProjectReadRepository'

// =============================================================================
// AnalyticsModule
// Tracks page views, project views, resume downloads.
// AuthModule imported — JwtAuthGuard on admin GET endpoints needs AuthService.
// ProjectModule imported — TrackProjectViewCommand and GetProjectViewsQuery
// both need IProjectReadRepository to check project existence (exported by
// ProjectModule) before writing/reading a project's view data.
// =============================================================================
@Module({
    imports: [AuthModule, ProjectModule],
    controllers: [AnalyticsController],
    providers: [
        // ─── Repositories ───────────────────────────────────────────────────────
        PrismaPageViewRepository,
        PrismaResumeDownloadRepository,
        PrismaProjectViewRepository,

        // ─── Interface tokens ───────────────────────────────────────────────────
        { provide: 'IPageViewRepository', useExisting: PrismaPageViewRepository },
        { provide: 'IResumeDownloadRepository', useExisting: PrismaResumeDownloadRepository },
        { provide: 'IProjectViewRepository', useExisting: PrismaProjectViewRepository },

        // ─── Use cases ──────────────────────────────────────────────────────────
        {
            provide: GetPageViewsQuery,
            useFactory: (repo: PrismaPageViewRepository) => new GetPageViewsQuery(repo),
            inject: [PrismaPageViewRepository],
        },
        {
            provide: GetProjectViewsQuery,
            useFactory: (viewRepo: PrismaProjectViewRepository, projectRepo: IProjectReadRepository) =>
                new GetProjectViewsQuery(viewRepo, projectRepo),
            inject: [PrismaProjectViewRepository, 'IProjectReadRepository'],
        },
        {
            provide: TrackPageViewCommand,
            useFactory: (repo: PrismaPageViewRepository) => new TrackPageViewCommand(repo),
            inject: [PrismaPageViewRepository],
        },
        {
            provide: TrackResumeDownloadCommand,
            useFactory: (repo: PrismaResumeDownloadRepository) => new TrackResumeDownloadCommand(repo),
            inject: [PrismaResumeDownloadRepository],
        },
        {
            provide: TrackProjectViewCommand,
            useFactory: (viewRepo: PrismaProjectViewRepository, projectRepo: IProjectReadRepository) =>
                new TrackProjectViewCommand(viewRepo, projectRepo),
            inject: [PrismaProjectViewRepository, 'IProjectReadRepository'],
        },
    ],

    // IResumeDownloadRepository exported for DataRetentionTask (root-level
    // provider in AppModule) to inject — same pattern AuthModule uses for
    // ITokenRepository → TokenCleanupTask.
    exports: [{ provide: 'IResumeDownloadRepository', useExisting: PrismaResumeDownloadRepository }],
})
export class AnalyticsModule {}
