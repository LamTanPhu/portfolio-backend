import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AnalyticsController } from './analytics.controller'
import { GetPageViewsQuery } from '../../../application/use-cases/queries/analytics/GetPageViewsQuery'
import { TrackPageViewCommand } from '../../../application/use-cases/commands/analytics/TrackPageViewCommand'
import { TrackProjectViewCommand } from '../../../application/use-cases/commands/analytics/TrackProjectViewCommand'
import { TrackResumeDownloadCommand } from '../../../application/use-cases/commands/analytics/TrackResumeDownloadCommand'
import { PrismaPageViewRepository } from '../../../infrastructure/database/repositories/PrismaPageViewRepository'
import { PrismaProjectViewRepository } from '../../../infrastructure/database/repositories/PrismaProjectViewRepository'
import { PrismaResumeDownloadRepository } from '../../../infrastructure/database/repositories/PrismaResumeDownloadRepository'

// =============================================================================
// AnalyticsModule
// Tracks page views, project views, resume downloads.
// AuthModule imported — JwtAuthGuard on admin GET endpoint needs AuthService.
// =============================================================================
@Module({
    imports: [AuthModule],
    controllers: [AnalyticsController],
    providers: [
        // ─── Repositories ───────────────────────────────────────────────────────
        PrismaPageViewRepository,
        PrismaResumeDownloadRepository,
        PrismaProjectViewRepository,

        // ─── Interface tokens ───────────────────────────────────────────────────
        { provide: 'IPageViewRepository',       useExisting: PrismaPageViewRepository },
        { provide: 'IResumeDownloadRepository', useExisting: PrismaResumeDownloadRepository },
        { provide: 'IProjectViewRepository',    useExisting: PrismaProjectViewRepository },

        // ─── Use cases ──────────────────────────────────────────────────────────
        {
            provide:    GetPageViewsQuery,
            useFactory: (repo: PrismaPageViewRepository) =>
                new GetPageViewsQuery(repo),
            inject: [PrismaPageViewRepository],
        },
        {
            provide:    TrackPageViewCommand,
            useFactory: (repo: PrismaPageViewRepository) =>
                new TrackPageViewCommand(repo),
            inject: [PrismaPageViewRepository],
        },
        {
            provide:    TrackResumeDownloadCommand,
            useFactory: (repo: PrismaResumeDownloadRepository) =>
                new TrackResumeDownloadCommand(repo),
            inject: [PrismaResumeDownloadRepository],
        },
        {
            provide:    TrackProjectViewCommand,
            useFactory: (repo: PrismaProjectViewRepository) =>
                new TrackProjectViewCommand(repo),
            inject: [PrismaProjectViewRepository],
        },
    ],
})
export class AnalyticsModule {}