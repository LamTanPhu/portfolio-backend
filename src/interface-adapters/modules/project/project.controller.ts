import {
  Controller,
  Get,
  Post,
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
import { GetPublishedProjectsQuery } from '../../../application/use-cases/queries/project/GetPublishedProjectsQuery'
import { GetProjectBySlugQuery } from '../../../application/use-cases/queries/project/GetProjectBySlugQuery'
import { CreateProjectCommand } from '../../../application/use-cases/commands/project/CreateProjectCommand'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'
import type { ProjectDTO } from '../../../application/dtos/ProjectDTO'
import { ProjectPresenter } from './project.presenter'
import { CreateProjectDto } from './project.dto'

// =============================================================================
// ProjectController
// Public routes — read published projects, no auth required.
// Admin routes — create, delete require valid JWT with fingerprint check.
// userId extracted from verified JWT payload — never trusted from client input.
// =============================================================================
@ApiTags('Project')
@Controller('projects')
export class ProjectController {
  constructor(
    private readonly getPublishedQuery: GetPublishedProjectsQuery,
    private readonly getBySlugQuery:    GetProjectBySlugQuery,
    private readonly createCommand:     CreateProjectCommand,
  ) {}

  // ===========================================================================
  // GET /api/projects
  // Returns published project summaries — description excluded, no auth required.
  // ===========================================================================
  @Get()
  @ApiOperation({ summary: 'Get all published projects' })
  @ApiResponse({ status: 200, description: 'List of published projects' })
  async findAll(): Promise<ProjectDTO[]> {
    const dtos = await this.getPublishedQuery.execute()
    return ProjectPresenter.toListResponse(dtos)
  }

  // ===========================================================================
  // GET /api/projects/:slug
  // Returns full project including description — public, no auth required.
  // Slug is unique indexed — O(1) lookup.
  // ===========================================================================
  @Get(':slug')
  @ApiOperation({ summary: 'Get project by slug' })
  @ApiParam({ name: 'slug', example: 'electric-motorcycle-rental-system' })
  @ApiResponse({ status: 200, description: 'Project found' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findBySlug(@Param('slug') slug: string): Promise<ProjectDTO> {
    const dto = await this.getBySlugQuery.execute(slug)
    return ProjectPresenter.toResponse(dto)
  }

  // ===========================================================================
  // POST /api/projects
  // Creates a new project — admin only, JWT required.
  // userId extracted from JWT payload — sub claim set at login.
  // Never trust userId from request body — always from verified token.
  // ===========================================================================
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create a new project — admin only' })
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
      // userId extracted from verified JWT payload — never from client input
      userId:       req.user.sub,
    })
    return ProjectPresenter.toResponse(result)
  }

  // ===========================================================================
  // DELETE /api/projects/:id
  // Deletes a project — admin only, JWT required.
  // TODO: Wire DeleteProjectCommand when built.
  // ===========================================================================
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
    // TODO: DeleteProjectCommand — wire when built
    void id
  }
}