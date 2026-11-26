/**
 * @fileoverview ProjectController
 *
 * Handles project-related endpoints for both public users and admin.
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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'

import { GetPublishedProjectsQuery } from '../../../application/use-cases/queries/project/GetPublishedProjectsQuery'
import { GetProjectBySlugQuery } from '../../../application/use-cases/queries/project/GetProjectBySlugQuery'
import { GetAllProjectsQuery } from '../../../application/use-cases/queries/project/GetAllProjectsQuery'
import { GetProjectForAdminQuery } from '../../../application/use-cases/queries/project/GetProjectForAdminQuery'
import { CreateProjectCommand } from '../../../application/use-cases/commands/project/CreateProjectCommand'
import { UpdateProjectCommand } from '../../../application/use-cases/commands/project/UpdateProjectCommand'
import { DeleteProjectCommand } from '../../../application/use-cases/commands/project/DeleteProjectCommand'

import type { ProjectDTO, ProjectSummaryDTO } from '../../../application/dtos/ProjectDTO'
import { CreateProjectDto, UpdateProjectDto } from './project.dto'
import { ProjectPresenter } from './project.presenter'

@ApiTags('Projects')
@Controller('projects')
export class ProjectController {
    constructor(
        private readonly getPublishedQuery: GetPublishedProjectsQuery,
        private readonly getBySlugQuery: GetProjectBySlugQuery,
        private readonly getAllQuery: GetAllProjectsQuery,
        private readonly getForAdminQuery: GetProjectForAdminQuery,
        private readonly createCommand: CreateProjectCommand,
        private readonly updateCommand: UpdateProjectCommand,
        private readonly deleteCommand: DeleteProjectCommand,
    ) {}

    @Get()
    @Throttle({ default: { limit: 120, ttl: 60_000 } })
    @ApiOperation({ summary: 'Get all published projects (Public)' })
    @ApiResponse({ status: 200, description: 'List of published projects' })
    async findAll(): Promise<ProjectSummaryDTO[]> {
        const dtos = await this.getPublishedQuery.execute()
        return ProjectPresenter.toSummaryListResponse(dtos)
    }

    // GET /api/projects/admin — every project, drafts included.
    // Declared BEFORE the public ':slug' route: Express matches in declaration
    // order, so 'admin' would otherwise be treated as a slug.
    @Get('admin')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Get all projects including drafts (Admin only)' })
    @ApiResponse({ status: 200, description: 'All project summaries' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async findAllAdmin(): Promise<ProjectSummaryDTO[]> {
        const dtos = await this.getAllQuery.execute()
        return ProjectPresenter.toSummaryListResponse(dtos)
    }

    // GET /api/projects/admin/:slug — one project, drafts included. This is the
    // ONLY way to read an unpublished project.
    @Get('admin/:slug')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Get one project by slug, drafts included (Admin only)' })
    @ApiParam({ name: 'slug', example: 'electric-motorcycle-rental-system' })
    @ApiResponse({ status: 200, description: 'Project found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    async findBySlugAdmin(@Param('slug') slug: string): Promise<ProjectDTO> {
        const dto = await this.getForAdminQuery.execute(slug)
        return ProjectPresenter.toResponse(dto)
    }

    @Get(':slug')
    @Throttle({ default: { limit: 100, ttl: 60_000 } })
    @ApiOperation({ summary: 'Get a published project by slug (Public)' })
    @ApiParam({ name: 'slug', example: 'electric-motorcycle-rental-system' })
    @ApiResponse({ status: 200, description: 'Project found' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    async findBySlug(@Param('slug') slug: string): Promise<ProjectDTO> {
        const dto = await this.getBySlugQuery.execute(slug)
        return ProjectPresenter.toResponse(dto)
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Create project — admin only' })
    @ApiResponse({ status: 201, description: 'Project created' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(@Body() dto: CreateProjectDto, @Req() req: AuthenticatedRequest): Promise<ProjectDTO> {
        const result = await this.createCommand.execute({
            name: dto.name,
            description: dto.description,
            techStack: dto.techStack,
            isOpenSource: dto.isOpenSource,
            isPublished: dto.isPublished ?? false,
            repoUrl: dto.repoUrl ?? null,
            liveUrl: dto.liveUrl ?? null,
            thumbnailUrl: dto.thumbnailUrl ?? null,
            userId: req.user.sub,
        })
        return ProjectPresenter.toResponse(result)
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Update project — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 200, description: 'Project updated' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto): Promise<ProjectDTO> {
        const result = await this.updateCommand.execute({
            id,
            name: dto.name,
            description: dto.description,
            techStack: dto.techStack,
            isOpenSource: dto.isOpenSource,
            isPublished: dto.isPublished,
            repoUrl: dto.repoUrl,
            liveUrl: dto.liveUrl,
            thumbnailUrl: dto.thumbnailUrl,
        })
        return ProjectPresenter.toResponse(result)
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete project — admin only' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({ status: 204, description: 'Project deleted' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.deleteCommand.execute(id)
    }
}
