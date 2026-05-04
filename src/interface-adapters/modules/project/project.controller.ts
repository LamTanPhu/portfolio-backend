import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'
import { GetPublishedProjectsQuery } from '../../../application/use-cases/queries/project/GetPublishedProjectsQuery'
import { GetProjectBySlugQuery } from '../../../application/use-cases/queries/project/GetProjectBySlugQuery'
import { CreateProjectCommand } from '../../../application/use-cases/commands/project/CreateProjectCommand'
import { UpdateProjectCommand } from '../../../application/use-cases/commands/project/UpdateProjectCommand'
import { DeleteProjectCommand } from '../../../application/use-cases/commands/project/DeleteProjectCommand'
import type { ProjectDTO } from '../../../application/dtos/ProjectDTO'
import { ProjectPresenter } from './project.presenter'
import { CreateProjectDto, UpdateProjectDto } from './project.dto'

// =============================================================================
// ProjectController
// Public GET — published projects, no auth required.
// Admin POST/PATCH/DELETE — JWT required.
// userId extracted from verified JWT payload — never from client input.
// =============================================================================
@ApiTags('Project')
@Controller('projects')
export class ProjectController {
  constructor(
    private readonly getPublishedQuery: GetPublishedProjectsQuery,
    private readonly getBySlugQuery:    GetProjectBySlugQuery,
    private readonly createCommand:     CreateProjectCommand,
    private readonly updateCommand:     UpdateProjectCommand,
    private readonly deleteCommand:     DeleteProjectCommand,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all published projects' })
  @ApiResponse({ status: 200, description: 'List of published projects' })
  async findAll(): Promise<ProjectDTO[]> {
    const dtos = await this.getPublishedQuery.execute()
    return ProjectPresenter.toListResponse(dtos)
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get project by slug' })
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
  @ApiOperation({ summary: 'Create a project — admin only' })
  @ApiResponse({ status: 201, description: 'Project created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() dto: CreateProjectDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ProjectDTO> {
    const result = await this.createCommand.execute({
      name:         dto.name,
      description:  dto.description,
      techStack:    dto.techStack,
      isOpenSource: dto.isOpenSource,
      isPublished:  dto.isPublished  ?? false,
      repoUrl:      dto.repoUrl      ?? null,
      liveUrl:      dto.liveUrl      ?? null,
      thumbnailUrl: dto.thumbnailUrl ?? null,
      userId:       req.user.sub,
    })
    return ProjectPresenter.toResponse(result)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update a project — admin only' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Project updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectDTO> {
    const result = await this.updateCommand.execute({
      id,
      name:         dto.name,
      description:  dto.description,
      techStack:    dto.techStack,
      isOpenSource: dto.isOpenSource,
      isPublished:  dto.isPublished,
      repoUrl:      dto.repoUrl,
      liveUrl:      dto.liveUrl,
      thumbnailUrl: dto.thumbnailUrl,
    })
    return ProjectPresenter.toResponse(result)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project — admin only' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 204, description: 'Project deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.deleteCommand.execute(id)
  }
}