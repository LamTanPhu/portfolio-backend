import { Controller, Get, Post, Body, Req, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger'
import { GetPageViewsQuery } from '../../../application/use-cases/queries/analytics/GetPageViewsQuery'
import { TrackPageViewCommand } from '../../../application/use-cases/commands/analytics/TrackPageViewCommand'
import { TrackResumeDownloadCommand } from '../../../application/use-cases/commands/analytics/TrackResumeDownloadCommand'
import { TrackProjectViewCommand } from '../../../application/use-cases/commands/analytics/TrackProjectViewCommand'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'

// =============================================================================
// AnalyticsController
// Tracks page views, project views, resume downloads.
// Public POST endpoints — called by frontend on page load.
// Admin GET endpoints — JWT required.
// =============================================================================
@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
    constructor(
        private readonly getPageViewsQuery:       GetPageViewsQuery,
        private readonly trackPageView:           TrackPageViewCommand,
        private readonly trackResumeDownload:     TrackResumeDownloadCommand,
        private readonly trackProjectView:        TrackProjectViewCommand,
    ) {}

    // ===========================================================================
    // POST /api/analytics/page-view
    // ===========================================================================
    @Post('page-view')
    @ApiOperation({ summary: 'Track a page view' })
    @ApiResponse({ status: 201, description: 'Page view recorded' })
    async trackPage(
        @Body('route') route: string,
    ): Promise<{ success: boolean }> {
        await this.trackPageView.execute(route)
        return { success: true }
    }

    // ===========================================================================
    // POST /api/analytics/project-view/:id
    // ===========================================================================
    @Post('project-view/:id')
    @ApiOperation({ summary: 'Track a project detail page view' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 201, description: 'Project view recorded' })
    async trackProject(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<{ success: boolean }> {
        await this.trackProjectView.execute(id)
        return { success: true }
    }

    // ===========================================================================
    // POST /api/analytics/resume-download
    // ===========================================================================
    @Post('resume-download')
    @ApiOperation({ summary: 'Track a resume download' })
    @ApiResponse({ status: 201, description: 'Resume download recorded' })
    async trackResume(
        @Req() req: Request,
    ): Promise<{ success: boolean }> {
        await this.trackResumeDownload.execute(
        req.ip ?? '',
        req.headers['user-agent'] ?? null,
        )
        return { success: true }
    }

    // ===========================================================================
    // GET /api/analytics/page-views — admin only
    // ===========================================================================
    @Get('page-views')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Get all page view stats — admin only' })
    @ApiResponse({ status: 200, description: 'Page view stats returned' })
    async getPageViews() {
        return this.getPageViewsQuery.execute()
    }
}