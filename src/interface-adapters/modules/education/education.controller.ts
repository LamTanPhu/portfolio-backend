/**
 * @fileoverview EducationController
 * 
 * Handles education records for the public portfolio and admin management.
 * 
 * - Public GET: Returns all education records (no authentication required)
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

import { GetEducationQuery } from '../../../application/use-cases/queries/skill/education/GetEducationQuery'
import { CreateEducationCommand } from '../../../application/use-cases/commands/education/CreateEducationCommand'
import { UpdateEducationCommand } from '../../../application/use-cases/commands/education/UpdateEducationCommand'
import { DeleteEducationCommand } from '../../../application/use-cases/commands/education/DeleteEducationCommand'

import type { EducationDTO } from '../../../application/dtos/education/EducationDTO'
import { CreateEducationDto, UpdateEducationDto } from './education.dto'

@ApiTags('Education')
@Controller('education')
export class EducationController {
    constructor(
        private readonly getQuery: GetEducationQuery,
        private readonly createCommand: CreateEducationCommand,
        private readonly updateCommand: UpdateEducationCommand,
        private readonly deleteCommand: DeleteEducationCommand,
    ) {}

    // ===========================================================================
    // Public Endpoints
    // ===========================================================================
    @Get()
    @Throttle({ default: { limit: 120, ttl: 60_000 } })
    @ApiOperation({ summary: 'Get all education records (Public)' })
    @ApiResponse({ status: 200, description: 'List of education records' })
    async findAll(): Promise<EducationDTO[]> {
        return this.getQuery.execute()
    }

    // ===========================================================================
    // Admin Endpoints
    // ===========================================================================
    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Create new education record — admin only' })
    @ApiResponse({ status: 201, description: 'Education record created' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(
        @Body() dto: CreateEducationDto,
        @Req() req: AuthenticatedRequest,
    ): Promise<EducationDTO> {
        return this.createCommand.execute({
        degreeName: dto.degreeName,
        instituteName: dto.instituteName,
        instituteUrl: dto.instituteUrl ?? null,
        startedAt: new Date(dto.startedAt),
        endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
        isCompleted: dto.isCompleted ?? false,
        userId: req.user.sub,
        })
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Update education record — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 200, description: 'Education record updated' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Education record not found' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateEducationDto,
    ): Promise<EducationDTO> {
        return this.updateCommand.execute({
        id,
        degreeName: dto.degreeName,
        instituteName: dto.instituteName,
        instituteUrl: dto.instituteUrl,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
        isCompleted: dto.isCompleted,
        })
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete education record — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 204, description: 'Education record deleted' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Education record not found' })
    async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.deleteCommand.execute(id)
    }
}