import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AnalyticsController } from './analytics.controller'
import { GetPageViewsQuery } from '../../../application/use-cases/queries/analytics/GetPageViewsQuery'
import { TrackPageViewCommand } from '../../../application/use-cases/commands/analytics/TrackPageViewCommand'
import { TrackResumeDownloadCommand } from '../../../application/use-cases/commands/analytics/TrackResumeDownloadCommand'
import { PrismaPageViewRepository } from '../../../infrastructure/database/repositories/PrismaPageViewRepository'
import { PrismaResumeDownloadRepository } from '../../../infrastructure/database/repositories/PrismaResumeDownloadRepository'

@Module({
    imports: [AuthModule],
    controllers: [AnalyticsController],
    providers: [
        PrismaPageViewRepository,
        PrismaResumeDownloadRepository,
        { provide: 'IPageViewRepository',       useExisting: PrismaPageViewRepository },
        { provide: 'IResumeDownloadRepository', useExisting: PrismaResumeDownloadRepository },
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
    ],
})
export class AnalyticsModule {}