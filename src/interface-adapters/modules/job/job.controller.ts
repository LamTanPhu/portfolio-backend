/**
 * @fileoverview JobController
 * 
 * Handles work experience records for the public portfolio and admin management.
 * 
 * - Public GET: Returns all job records (no authentication required)
 * - Admin POST/PATCH/DELETE: Requires valid JWT
 * - userId is extracted from JWT payload — never trusted from client input
 */

import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common'
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'

import { GetJobsQuery } from '../../../application/use-cases/queries/skill/jobs/GetJobsQuery'
import { CreateJobCommand } from '../../../application/use-cases/commands/job/CreateJobCommand'
import { UpdateJobCommand } from '../../../application/use-cases/commands/job/UpdateJobCommand'
import { DeleteJobCommand } from '../../../application/use-cases/commands/job/DeleteJobCommand'

import type { JobDTO } from '../../../application/dtos/JobDTO'
import { CreateJobDto, UpdateJobDto } from './job.dto'

@ApiTags('Jobs')
@Controller('jobs')
export class JobController {
    constructor(
        private readonly getQuery: GetJobsQuery,
        private readonly createCommand: CreateJobCommand,
        private readonly updateCommand: UpdateJobCommand,
        private readonly deleteCommand: DeleteJobCommand,
    ) {}

    // ===========================================================================
    // Public Endpoints
    // ===========================================================================
    @Get()
    @Throttle({ default: { limit: 120, ttl: 60_000 } })
    @ApiOperation({ summary: 'Get all work experience records (Public)' })
    @ApiResponse({ status: 200, description: 'List of work experience records' })
    async findAll(): Promise<JobDTO[]> {
        return this.getQuery.execute()
    }

    // ===========================================================================
    // Admin Endpoints
    // ===========================================================================
    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Create new work experience record — admin only' })
    @ApiResponse({ status: 201, description: 'Job record created' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(
        @Body() dto: CreateJobDto,
        @Req() req: AuthenticatedRequest,
    ): Promise<JobDTO> {
        return this.createCommand.execute({
        companyName: dto.companyName,
        role: dto.role,
        startedAt: new Date(dto.startedAt),
        endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
        isEnded: dto.isEnded ?? false,
        userId: req.user.sub,
        })
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Update work experience record — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 200, description: 'Job record updated' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Job record not found' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateJobDto,
    ): Promise<JobDTO> {
        return this.updateCommand.execute({
        id,
        companyName: dto.companyName,
        role: dto.role,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
        isEnded: dto.isEnded,
        })
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete work experience record — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 204, description: 'Job record deleted' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Job record not found' })
    async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.deleteCommand.execute(id)
    }
}