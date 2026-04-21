import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { GetPublishedProjectsQuery } from '../../../application/use-cases/queries/project/GetPublishedProjectsQuery'
import { GetProjectBySlugQuery } from '../../../application/use-cases/queries/project/GetProjectBySlugQuery'
import { CreateProjectCommand } from '../../../application/use-cases/commands/project/CreateProjectCommand'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import { ProjectPresenter } from './project.presenter'
import { CreateProjectDto } from './project.dto'

@Controller('projects')
export class ProjectController {
  constructor(
    private readonly getPublishedQuery: GetPublishedProjectsQuery,
    private readonly getBySlugQuery: GetProjectBySlugQuery,
    private readonly createCommand: CreateProjectCommand,
  ) {}

  @Get()
  async findAll() {
    const dtos = await this.getPublishedQuery.execute()
    return ProjectPresenter.toListResponse(dtos)
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    const dto = await this.getBySlugQuery.execute(slug)
    return ProjectPresenter.toResponse(dto)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateProjectDto) {
    const result = await this.createCommand.execute({
      name: dto.name,
      description: dto.description,
      techStack: dto.techStack,
      isOpenSource: dto.isOpenSource,
      isPublished: dto.isPublished ?? false,
      repoUrl: dto.repoUrl ?? null,
      liveUrl: dto.liveUrl ?? null,
      thumbnailUrl: dto.thumbnailUrl ?? null,
      userId: 1,
    })
    return ProjectPresenter.toResponse(result)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    void id
  }
}