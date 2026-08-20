/**
 * @fileoverview AuditController
 *
 * Admin-only read access to the recent-activity trail.
 * No write endpoints here — entries are created exclusively by
 * AuditLogInterceptor, never directly by a client request. No delete
 * endpoint either — cleanup is DataRetentionTask's job, not an admin action.
 */

import { Controller, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import { GetAuditLogsQuery } from '../../../application/use-cases/queries/audit/GetAuditLogsQuery'
import type { AuditLogPageDTO } from '../../../application/use-cases/queries/audit/GetAuditLogsQuery'

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
    constructor(private readonly getAuditLogs: GetAuditLogsQuery) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Get recent admin activity (paginated) — admin only' })
    @ApiResponse({ status: 200, description: 'Paginated audit log entries' })
    async findAll(
        @Query('cursor', new ParseIntPipe({ optional: true })) cursor?: number,
        @Query('limit',  new ParseIntPipe({ optional: true })) limit?: number,
    ): Promise<AuditLogPageDTO> {
        return this.getAuditLogs.execute(cursor, limit)
    }
}
