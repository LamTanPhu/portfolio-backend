import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { TrackPageViewCommand } from '../../../application/use-cases/commands/analytics/TrackPageViewCommand'
import { TrackResumeDownloadCommand } from '../../../application/use-cases/commands/analytics/TrackResumeDownloadCommand'
import { GetPageViewsQuery } from '../../../application/use-cases/queries/analytics/GetPageViewsQuery'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'

@Controller('analytics')
export class AnalyticsController {
    constructor(
        private readonly getPageViewsQuery: GetPageViewsQuery,
        private readonly trackPageView: TrackPageViewCommand,
        private readonly trackResumeDownload: TrackResumeDownloadCommand,
    ) {}

    @Post('page-view')
    async trackPage(@Body('route') route: string): Promise<{ success: boolean }> {
        await this.trackPageView.execute(route)
        return { success: true }
    }

    @Post('resume-download')
    async trackResume(@Req() req: Request): Promise<{ success: boolean }> {
        await this.trackResumeDownload.execute(
        req.ip ?? '',
        req.headers['user-agent'] ?? null,
        )
        return { success: true }
    }

    @Get('page-views')
    @UseGuards(JwtAuthGuard)
    async getPageViews() {
        return this.getPageViewsQuery.execute()
    }
}